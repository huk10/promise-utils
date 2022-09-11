/**
 * 1. 每个任务带有级别（level）和优先级（priority）.
 * 2. 一个指定大小的任务队列.
 * 3. 进入调度器的任务会等待一个事件循环（setTimeout(0)）后开始调度.
 * 4. 每个级别（level）在任务队列中都占有几个固定大小的槽，不同级别的任务都在其对应的槽中执行
 * 5. 抢占式，如果高级别的槽都已被使用，那么将去抢占比它更低级别的槽。
 * 6. 同级别的任务由优先级（priority）细分顺序
 * 7. 防止饿死，采用提升级别的方式，如果一个低级别任务在多次调度中都没有被执行，那么它的级别将提升。
 */

export enum Level {
  high = 2,
  low = 0,
  middle = 1,
}

export type Task<T = Promise<unknown>> = {
  fn: () => T
  level?: Level
  priority?: number
}

export interface Option {
  taskSlotTotal?: number
  lowTaskSlotCount?: number
  middleTaskSlotCount?: number
}

interface TaskInfo extends Required<Task> {
  skip: number
  isRunning: boolean
  reject: (err: unknown) => void
  resolve: (result: any) => void
}

// Scheduler Dispatcher
export class RequestDispatcher {
  private waitQueue: Array<TaskInfo> = []

  // TODO 整合成一个优先队列
  private lowLevelQueue: Array<TaskInfo> = []
  private highLevelQueue: Array<TaskInfo> = []
  private middleLevelQueue: Array<TaskInfo> = []

  // 当前正在运行的任务数
  private low: number = 0
  private middle: number = 0
  private runTasking: number = 0

  // 是否正在收集任务
  private isWaitSchedule = false

  private readonly taskSlotTotal: number = 6
  private readonly middleTaskSlotCount: number = 2
  private readonly lowTaskSlotCount: number = 1


  constructor(opt: Option) {
    this.taskSlotTotal = opt.taskSlotTotal ?? 6
    this.middleTaskSlotCount = opt.middleTaskSlotCount ?? 2
    this.lowTaskSlotCount = opt.lowTaskSlotCount ?? 1
  }

  exec<R>(task: Task<Promise<R>>): Promise<R> {
    return new Promise((resolve, reject) => {
      this.waitQueue.push({
        reject,
        resolve,
        skip: 0,
        fn: task.fn,
        isRunning: false,
        level: task.level ?? Level.high,
        priority: Math.max(task.priority ?? 1, 1),
      })
      if (!this.isWaitSchedule) {
        this.isWaitSchedule = true
        this.waitNextLoop()
      }
    })
  }

  private divert() {
    const queue = this.waitQueue.slice()
    this.waitQueue.length = 0
    this.isWaitSchedule = false
    for (const task of queue) {
      switch (task.level) {
        case Level.low:
          this.lowLevelQueue.push(task)
          break
        case Level.middle:
          this.middleLevelQueue.push(task)
          break
        case Level.high:
          this.highLevelQueue.push(task)
          break
        default:
          throw new Error("unknown level")
      }
    }
  }

  private waitNextLoop() {
    setTimeout(() => {
      this.divert()
      this.schedule()
    }, 0)
  }

  // 任务队列已满
  private isFull(task: TaskInfo) {
    if (task.level === Level.high) {
      return this.runTasking >= this.taskSlotTotal
    }
    if (task.level === Level.middle) {
      return this.runTasking >= this.taskSlotTotal || this.middle + this.low >= (this.middleTaskSlotCount + this.lowTaskSlotCount)
    }
    return this.runTasking >= this.taskSlotTotal || this.low >= this.lowTaskSlotCount
  }

  private schedule() {
    if (this.runTasking >= this.taskSlotTotal) return
    if (this.highLevelQueue.length) {
      this.pushTask(this.highLevelQueue)
      this.highLevelQueue = this.highLevelQueue.filter(val => !val.isRunning)
    }
    if (this.middleLevelQueue.length) {
      if (this.middle + this.low < (this.middleTaskSlotCount + this.lowTaskSlotCount)) {
        this.pushTask(this.middleLevelQueue)
        this.middleLevelQueue = this.middleLevelQueue.filter(val => !val.isRunning)
      }
    }
    if (this.lowLevelQueue.length) {
      if (this.low == 0) {
        this.pushTask(this.lowLevelQueue)
        this.lowLevelQueue = this.lowLevelQueue.filter(val => !val.isRunning)
      }
    }
    this.lowLevelQueue.forEach(val => val.skip += 1)
    this.middleLevelQueue.forEach(val => val.skip += 1)
    this.upgrade()
  }

  private pushTask(queue: Array<TaskInfo>) {
    if (queue.length) {
      queue.sort((a, b) => a.priority > b.priority ? -1 : 1)
      for (const task of queue) {
        if (this.isFull(task)) break
        this.runTasking += 1
        if(task.level === Level.middle) {
          this.middle += 1
          if (this.middle > this.middleTaskSlotCount) {
            this.low +=1
            this.middle-=1
          }
        }
        if(task.level === Level.low) {
          this.low += 1
        }
        task.isRunning = true
        this.runTask(task)
      }
    }
  }

  private upgrade() {
    const flags = [0, 0]
    for (const lowTask of this.lowLevelQueue) {
      if (lowTask.skip >= 6) {
        flags[0] = 1
        lowTask.skip = 0
        lowTask.level = Level.middle
        lowTask.priority = 1000
        this.middleLevelQueue.push(lowTask)
      }
    }
    for (const midTask of this.middleLevelQueue) {
      if (midTask.skip >= 6) {
        flags[1] = 1
        midTask.skip = 0
        midTask.level = Level.high
        midTask.priority = 1000
        this.highLevelQueue.push(midTask)
      }
    }
    if (flags[0] === 1) {
      this.lowLevelQueue = this.lowLevelQueue.filter(val => val.level === Level.low)
    }
    if (flags[1] === 1) {
      this.middleLevelQueue = this.middleLevelQueue.filter(val => val.level === Level.middle)
    }
  }

  private runTask(task: TaskInfo) {
    task.fn()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        this.runTasking -= 1
        if (task.level === Level.middle) {
          this.middle -= 1
          if (this.middle < 0) {
            this.low -=1
          }
        }
        if (task.level === Level.low) {
          this.low -= 1
        }
        this.schedule()
      })
  }
}

