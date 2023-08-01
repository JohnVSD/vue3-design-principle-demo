/**
 * # 6.3 自动脱 ref 
 * toRefs 函数解决了响应式丢失问题，但同时带来了新的问题。由于 toRefs 会把响应式数据的第一层属性值转换为 ref，
 * 因此必须通过 value 来访问属性值，如下：
 * ```
 * const obj = reactive({ foo: 1 });
 * const newObj = { ...toRefs(obj) }
 * // 必须使用 value 访问值
 * newObj.foo.value // 1
 * ```
 * 这样会增加用户的心智负担。
 * 
 * 所谓自动脱 ref 指的是属性的访问行为，即如果读取的属性是一个 ref，则直接将该 ref 对应的 value 值返回
 * 如：直接像对象访问属性一样 newObj.foo
 */ 

import { effect, reactive } from "./reactive.js";
import { toRef, toRefs } from "./ref.js";

// 要实现此功能，需要为 newObj 创建一个代理对象，通过代理来实现最终目标，这时就会用到之前的提到的 __v_isRef 的标识
function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      // 自动脱 ref 实现：如果读取的值是 ref 则返回它的 value 属性值
      return value.__v_isRef ? value.value : value;
    },
    // 自动为 ref 设置值
    set(target, key, newValue, receiver) {
      // 通过 target 读取真实值
      const value = target[key];
      // 如果值是 Ref，则设置其对应的 value 属性值
      if (value.__v_isRef) {
        value.value = newValue;
        return true;
      }

      return Reflect.set(target, key, newValue, receiver);
    }
  })
}

{
  const obj = reactive({ foo: 1, bar: 2 });
  const newObj = proxyRefs({ ...toRefs(obj) });

  console.log(newObj.foo);
  console.log(newObj.bar);
}

/**
 * ! 实际上我们在编写 Vue 组件时，组件中的 setup 函数所返回的数据会传递给 proxyRefs 函数进行处理：
 * ```
 * const MyComponent = {
 *    setup() {
 *      const count = ref(0);
 *      // 返回的这个对象会传递给 proxyRefs
 *      return { count }
 *    }
 * }
 * // 这就是为什么我们在模板中可以直接访问一个 ref 的值，而无须通过 value 属性来访问
 * <p>{{ count }}</p>
 * ```
 */
function test() {}

