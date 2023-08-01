/**
 * # 6.2 响应丢失问题
 * 主要是由 (...) 对象展开运算符导致的
 */
import { effect, reactive } from "./reactive.js";
import { toRef, toRefs } from "./ref.js";

// 响应丢失示例
{
  // const obj = reactive({ foo: 1, bar: 2 });
  // // 将响应式数据展开到一个新的对象 newObj
  // // 等价于 newObj = { foo: 1, bar: 2 }
  // const newObj = {
  //   ...obj
  // }

  // effect(() => {
  //   console.log(obj.foo);
  // })

  // // 很显然，此时修改 obj.foo 并不会触发响应
  // obj.foo = 100
}

// 解决方案
{
  const obj = reactive({ foo: 1, bar: 2 });
  // 将响应式数据展开到一个新的对象 newObj
  // 等价于 newObj = { foo: 1, bar: 2 }
  // const newObj = {
  //   foo: toRef(obj, 'foo')
  // }

  // 批量转换可以使用 toRefs
  const newObj = {
    ...toRefs(obj)
  }

  effect(() => {
    console.log(obj.foo);
  })

  // 很显然，此时修改 obj.foo 并不会触发响应
  newObj.foo.value = 234
}