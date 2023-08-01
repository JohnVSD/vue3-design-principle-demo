import { reactive } from "./reactive.js";

/**
 * * 6.1 接受一个原始值，返回一个响应式包裹对象
 * @param {any} 原始值
 * @return {Proxy} 响应式代理对象
 */ 
export function ref(val) {
  const wrapper = {
    value: val
  }

  // 为了方便区分一个数据是否是 ref 
  // 使用 Object.defineProperty 在 wrapper 对象上定义一个不可枚举的属性 __v_isRef，并且值为 true
  Object.defineProperty(wrapper, "__v_isRef", {
    value: true
  })

  // 将包裹对象变成响应式数据
  return reactive(wrapper)
}

/**
 * * 6.2 响应丢失问题 
 * > 将目标对象属性变为访问器属性
 * ```
 * // obj 是响应数据
 * const obj = reactive({ foo: 1 });
 * // newObj 下的属性每一个都是一个访问器属性，当读取 value 值时，其实读取的是 obj 对象下对应的属性值，可以触发响应式
 * const newObj = {
 *   foo: {
 *      get value() {
 *        return obj.foo
 *      }
 *   }
 * }
 * ```
 */ 
export function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    // 增加 setter 函数，设置 value 属性值时，最终设置的是响应式数据的同名属性值，这样就可以正确的触发响应
    set value(val) {
      obj[key] = val;
    }
  }

  Object.defineProperty(wrapper, "__v_isRef", {
    value: true
  })

  return wrapper;
}

// 批量 toRef
export function toRefs(obj) {
  const ret = {};

  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }

  return ret;
}

/**
 * * 6.3 自动脱 ref
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
 * 要实现此功能，需要为 newObj 创建一个代理对象，通过代理来实现最终目标，这时就会用到之前的提到的 __v_isRef 的标识
 */ 
export function proxyRefs(target) {
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
