/**
 * # 5.7 代理数组 
 * * 数组常见的 “读取” 方法，要比对象丰富的多
 *  1.访问数组的长度 arr.length
 *  2.通过索引访问元素 arr[0]
 *  3.把数组作为对象，使用 for...in 循环遍历
 *  4.for...of 迭代遍历数组
 *  5.数组的原型方法：concat/join/ecery/some/find/findIndex/includes 等，以及所有不改变原数组的原型方法
 * * 数组常见的 “设置” 操作：
 *  1.通过索引修改数组元素值：arr[1] = 3
 *  2.修改数组长度：arr.length = 0
 *  3.数组的栈方法：push/pop/shift/unshift
 *  4.修改原数组的原型方法：splice/fill/sort 等
 */ 
import { effect, reactive } from './reactive.js'

// # 5.7.1 数组的索引与length 设置/添加 属性逻辑。改动 set 和 trigger
// {
//   const arr = reactive([1]);
//   effect(() => {
//     console.log(arr.length);
//   })
//   setTimeout(() => {
//     // 此时 length 应该变为2，副作用函数应该执行。修改代理 set 方法
//     arr[1] = 'foo'
//   }, 500);

//   // 修改数组的 length 属性也会隐式的影响数组元素。改动 set 和 trigger
//   const arr = reactive(['foo'])
//   effect(()=>{
//     console.log('effect：', arr[0]);
//   })
//   setTimeout(() => {
//     arr.length = 0
//   }, 500);
// }

// # 5.7.2 遍历数组
// 数组的 fon...in 修改代理 ownKeys 方法
// {
//   const arr = reactive(['foo', 'bar'])
//   effect(()=>{
//     for (const num in arr) {
//       console.log(num);
//     }
//   })
//   setTimeout(() => {
//     console.log('add元素');
//     arr[2] = 'baz'
//   }, 500);
// }
// 数组的 for...of 迭代器方法
// for...of 操作依赖的基本语义可以在语言规范23.1.5.1节中看到。
// 可以了解到迭代数组主要依赖数组的长度和索引，只要将此与副作用建立联系就能实现响应式的 for...of 迭代
// 所以不需要新增任何方法就可以实现
// {
//   const arr = reactive([1, 2, 3])

//   effect(()=>{
//     for (const num of arr) {
//       console.log(num);
//     }
//   })

//   setTimeout(() => {
//     console.log('修改索引')
//     arr[1] = 'bar'
//   }, 500);

//   setTimeout(() => {
//     console.log('修改长度');
//     arr.length = 1
//   }, 1000);
// }

// # 5.7.3 数组的查找方法
// 正常情况下原型方法如: includes 与对象访问属性方式一样，无需额外处理，但在某些情况下会出现不符合预期的情况，如下：
{
  const obj = {};
  const arr = reactive([obj]);
  
  // console.log(arr.includes(arr[0])) // 修改前 false 输出不符合预期
  // 不符合预期的原因，是 includes 语言规范内部会读取 this 属性，而此时的 this 指向的是代理对象 arr；
  // arr[0]是可代理对象，reactive 内部实现如果对象的属性是可代理对象，则将其包装成代理对象返回，而两个代理对象是不同的。
  // 要对 reactive 进行修改
  // console.log(arr.includes(arr[0])) // 修改后 true 符合预期

  // 
  // 因为 includes 内部的 this 指向的是代理对象 arr，而 obj 是原始对象，所以不一致。
  // 但是从用户角度看，这是符合直觉的一种操作，应该返回 true。
  // 所以我们要对其进行调整，需要重写数组的 includes 方法并实现自定义行为，才能解决这个问题
  console.log(arr.indexOf(obj)) // 修改前 false；修改后 true 符合预期
}

// # 5.7.4 隐式修改数组长度的原型方法
// push/pop/shift/unshift