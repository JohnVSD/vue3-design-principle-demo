/**
 * # 5.4 合理的触发响应
 */ 

import { effect, reactive } from './reactive.js'

// # 5.4.1 值相同时情况
// {
//   const obj = {};
//   const bar = { bar: 2 };
//   const rBar = reactive(bar);``

//   effect(() => {
//     console.log('rBar：', rBar.bar);
//   })

//   setTimeout(() => {
//     // * 赋值与原始值相同，没必要再次触发副作用函数 (详见 reactive 函数内部实现)
//     rBar.bar = 2
//   }, 1000)
// }

// # 5.4.2 原型继承属性的情况
{
  const obj = {};
  const proto = { bar: 1 };
  const child = reactive(obj);
  const parent = reactive(proto);
  Object.setPrototypeOf(child, parent);

  effect(() => {
    console.log('输出：', child.bar);
  })

  setTimeout(() => {
    child.bar = 2
  }, 1000);
}