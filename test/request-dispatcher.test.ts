import { RequestDispatcher } from '../src/request-dispatcher';
import { setTimeout } from "node:timers/promises";

const dispatcher = new RequestDispatcher({})

describe('dispatcher', () => {
  test('返回结果是否正确:', async () => {
    const values: number[] = [];
    dispatcher.exec({level: 0, fn: async () => 1}).then(res => values.push(res))
    dispatcher.exec({level: 0, fn: async () => 2}).then(res => values.push(res))
    dispatcher.exec({level: 0, fn: async () => 3}).then(res => values.push(res))
    await setTimeout(300)
    expect(values).toEqual([1, 2, 3])
  })
  test('优先级是否正确:', async () => {
    const values: number[] = [];
    dispatcher.exec({level: 0, fn: async () => 1}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 2}).then(res => values.push(res))
    dispatcher.exec({level: 2, fn: async () => 3}).then(res => values.push(res))
    await setTimeout(300)
    expect(values).toEqual([3, 2, 1])
  })
  test('同级别优先级是否正确:', async () => {
    const values: number[] = [];
    dispatcher.exec({priority: 10, fn: async () => 1}).then(res => values.push(res))
    dispatcher.exec({priority: 50, fn: async () => 2}).then(res => values.push(res))
    dispatcher.exec({priority: 20, fn: async () => 3}).then(res => values.push(res))
    await setTimeout(300)
    expect(values).toEqual([2, 3, 1])
  })
  test('优先级提升:', async () => {
    const values: number[] = [];
    dispatcher.exec({level: 0, fn: async () => 1}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 2}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 3}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 4}).then(res => values.push(res))
    dispatcher.exec({level: 0, fn: async () => 5}).then(res => values.push(res))
    await setTimeout(160)
    dispatcher.exec({level: 0, fn: async () => 6}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 7}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 8}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 9}).then(res => values.push(res))
    await setTimeout(300)
    expect(values).toEqual([2, 3, 4, 1, 5, 7, 8, 9, 6])
  })
  test('优先级提升2:', async () => {
    const values: number[] = [];
    dispatcher.exec({level: 0, fn: async () => 1}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 2}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 3}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 4}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 5}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 6}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 7}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 8}).then(res => values.push(res))
    dispatcher.exec({level: 1, fn: async () => 9}).then(res => values.push(res))
    await setTimeout(300)
    expect(values).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 1])
  })
})
