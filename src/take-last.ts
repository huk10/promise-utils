/**
 * 对传入的函数进行包装（解决异步获取数据的时序问题）
 * 返回一个新的异步函数（入参和返回值与传入的函数是一致的），该异步函数多次调用只会返回最新的结果。
 * 1. this 指向逻辑不变
 * 2. 同一时刻多次调用（一个调用还没有返回时触发再一次调用）所有的返回值以最后一次调用的为准（每个调用都等待最后一次调用的返回，并且返回值都是相同的），即使前面的调用出错了。
 * 3. 会导致多次调用的 promise 在同一时间全部返回相同的值
 * @param fn 一个返回 promise 的函数
 * @return {fn}
 */
export function takeLast<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  let times = 0
  let resolveQueue: Array<(value: R) => void> = []
  let rejectQueue: Array<(error: unknown) => void> = []
  return function (this: unknown, ...args ) {
    const self = this
    return new Promise(async (resolve, reject) => {
      times += 1
      const current = times
      rejectQueue.push(reject)
      resolveQueue.push(resolve)
      try {
        const result = await fn.apply(self, args)
        if (current !== times) {
          return
        }
        resolveQueue.forEach(resolve1 => resolve1(result))
        resolveQueue.length = 0
      } catch (err: unknown) {
        if (current !== times) {
          return
        }
        rejectQueue.forEach(reject1 => reject1(err))
        rejectQueue.length = 0
      }
    })
  }
}

