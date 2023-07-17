/**
 * # 5.5 深响应与浅响应
 */ 
import { effect, reactive, shallowReactive } from './reactive.js'

// * 对象中属性也是一个对象的时候响应式会失效
const obj = {
  foo: {
    bar: 1
  }
}
// const proxyObj = reactive(obj);
const proxyObj = shallowReactive(obj);

effect(() => {
  console.log('--- effect：', proxyObj.foo.bar);
})

setTimeout(() => {
  proxyObj.foo = {
    bar: 2
  }
}, 500);

setTimeout(() => {
  proxyObj.foo.bar = 3;
}, 1000);