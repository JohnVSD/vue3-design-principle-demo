/**
 * # 5.6 只读和浅只读 
 * 将数据的属性变为只读，当用户尝试修改只读数据时进行，会收到一条警告信息
 */ 
import { effect, readonly, shallowReadonly } from './reactive.js'

const obj = {
  foo: {
    bar: 1
  }
}
// const proxyObj = readonly(obj)
const proxyObj = shallowReadonly(obj)

effect(() => {
  console.log('effect：', proxyObj.foo);
})

setTimeout(() => {
  proxyObj.foo.bar = 2
}, 500);