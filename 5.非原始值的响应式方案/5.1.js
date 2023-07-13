/**
 * # Proxy 和 Reflect 
 * Reflect 是一个全局对象，其下有很多方法，如：Reflect.get()、Reflect.set()、Reflect.apply()
 * 提供了一组用于对象字面量和数组字面量的方法，以及用于访问和修改对象属性的方法。它的作用是在运行时动态地修改对象和数组的内容和结构，而无需显式地创建新对象或数组。
 * Reflect 下的方法与 Proxy 的拦截器方法名称相同。Proxy 拦截器下的任何方法都能在 Reflect 下找到。
 * e.g：Reflect.set(target, property, value)：设置对象 target 上的属性 property 的值为 value。
 */ 

// ! 响应式实现部分
let activeEffect;
let effectStack = [];
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)

    activeEffect = effectFn;
   // 将当前执行函数压入栈
    effectStack.push(activeEffect);
    const res = fn();
    // 当前函数执行完毕后弹出栈
    effectStack.pop();
    // 当前函数指向栈结构最后一项
    activeEffect = effectStack[effectStack.length - 1]

    return res;
  }
  // 选项参数
  effectFn.options = options
  // 用来存储所有与当前副作用函数相关联的依赖集合
  effectFn.deps = []
  
  // 带有 lazy 属性时，将副作用函数直接 return
  if (options.lazy) {
    return effectFn
  }

  effectFn()
}

function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0
}

let bucket = new WeakMap();
// 追踪和收集依赖
function track(target, key) {
  if (!activeEffect) return target[key];

  let depsMap = bucket.get(target)
  if(!depsMap){
    bucket.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  deps.add(activeEffect)
  activeEffect.deps.push(deps)
}

// 触发依赖
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return;
  const effects = depsMap.get(key)

  const effectsToRun = new Set()
  // 因为读取和设置操作是在同一个副作用函数内进行的导致了递归执行；
  // 增加守卫条件避免递归，trigger 触发的副作用函数与当前正在执行的副作用函数相同，则不触发
  effects && effects.forEach(effectFn => {
    if (activeEffect !== effectFn) {
      effectsToRun.add(effectFn)
    }
  })

  effectsToRun.forEach(effectFn => {
    // 如果一个副作用函数存在调度器，则调用该调度器，并把副作用函数作为参数传递
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

// ==============================================================================================
// todo1 Reflect.get 的第三个参数，receiver
// const obj = {
//   foo: 1,
//   get getFoo() {
//     return this.foo
//   }
// }
// console.log('不带 receiver：', Reflect.get(obj, 'getFoo'));  // 输出 1
// 改变了 this 指向
// console.log('带 receiver：', Reflect.get(obj, 'getFoo', { foo: 2 })); // 输出 2

// todo2 举例说明
// ? 与 Proxy 的关系，解决了什么问题？如下：

// * Before
// {
//   const data = {
//     foo: 1,
//     get bar() {
//       return this.foo
//     }
//   };
//   const pObj = new Proxy(data, {
//     get(target, key) {
//       track(target, key);

//       // 此处 target 为原始对象，key 为 bar，target[bar] 等同于 data.bar，this指向原始对象，并不是代理对象，所以没有触发副作用函数重新执行
//       return target[key];
//     },
//     set(target, key, newVal) {
//       target[key] = newVal;
//       trigger(target, key)
//     }
//   })

//   effect(() => {
//     console.log(pObj.bar);
//   })

//   // bar 是一个访问器属性，返回 foo 的值，对 foo 有依赖，所以当 foo 变动时理论上 effect 函数应该重新执行，但其实并没有执行
//   setTimeout(() => {
//     console.log('修改foo值');
//     pObj.foo = 2
//   }, 1000);
// }

// * After
const data = {
  foo: 1,
  get bar() {
    return this.foo
  }
};

const pObj = new Proxy(data, {
  // 拦截操作接收第三个参数 receiver（Proxy本身）
  get(target, key, receiver) {
    track(target, key);

    // return target[key];
    // ! New 变为使用 Reflect 操作
    return Reflect.get(target, key, receiver)
  },
  set(target, key, newVal) {
    target[key] = newVal;
    trigger(target, key)
  }
})

effect(() => {
  console.log(pObj.bar);
})

// bar是一个访问器属性返回foo的值，对foo有依赖，所以当foo变动时理论上 effect 函数应该重新执行，但其实并没有执行
setTimeout(() => {
  console.log('采用Relect操作后，修改foo值');
  pObj.foo++
}, 1000);