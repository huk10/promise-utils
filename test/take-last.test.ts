import { setTimeout } from "node:timers/promises";
import { takeLast } from '../src/take-last';

async function asyncFn<T>(value: T, isError: boolean, timer: number) {
  await setTimeout(timer)
  if (isError) {
    throw value
  }
  return value
}


describe('takeLast', () => {
  test('最终结果是否正确:', async () => {
    const fn = takeLast(asyncFn);
    let value = 0;
    fn(1, false, 300).then(res => value = res)
    fn(2, false, 500).then(res => value = res)
    fn(3, false, 200).then(res => value = res)
    await setTimeout(600)
    expect(value).toBe(3)
  })
  test('所有结果是否正确（都返回最后一个值）:', async () => {
    const fn = takeLast(asyncFn);
    const value = [] as number[];
    fn(1, false, 300).then(res => value.push(res))
    fn(2, false, 500).then(res => value.push(res))
    fn(3, false, 200).then(res => value.push(res))
    await setTimeout(600)
    expect(value).toEqual([3, 3, 3])
  })
  test('所有结果是否正确（部分调用抛出异常）:', async () => {
    const fn = takeLast(asyncFn);
    const value = [] as number[];
    fn(1, true, 300).then(res => value.push(res))
    fn(2, true, 500).then(res => value.push(res))
    fn(3, false, 200).then(res => value.push(res))
    await setTimeout(600)
    expect(value).toEqual([3, 3, 3])
  })
  test('所有结果是否正确（最终结果抛出异常）:', async () => {
    const fn = takeLast(asyncFn);
    const value = [] as number[];
    const error = [] as number[];
    fn(1, false, 300).then(res => value.push(res)).catch(res => error.push(res))
    fn(2, false, 500).then(res => value.push(res)).catch(res => error.push(res))
    fn(3, true, 200).then(res => value.push(res)).catch(res => error.push(res))
    await setTimeout(600)
    expect(value).toEqual([])
    expect(error).toEqual([3, 3, 3])
  })
})

