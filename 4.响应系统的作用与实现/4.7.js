/**
 * # 4.7 调度执行
 * > 副作用函数中获取和设置属性操作同时发生时会触发程序一直执行，最终堆栈溢出
 */

let activeEffect;
// 副作用函数执行栈
let effectStack = [];
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)

    activeEffect = effectFn;
    // 将当前执行函数压入栈
    effectStack.push(activeEffect);
    fn();
    // 当前函数执行完毕后弹出栈
    effectStack.pop();
    // 当前函数指向栈结构最后一项
    activeEffect = effectStack[effectStack.length - 1]
  }

  // * 新增
  effectFn.options = options
  // 用来存储所有与当前副作用函数相关联的依赖集合
  effectFn.deps = []
  
  effectFn()
}

function cleanup(effectFn) {
  for (let i = 0; i<effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0
}

// 原始数据
const data = {
  foo: 1, 
};
const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
    track(target, key);
    return target[key];
  },
  // 拦截设置操作
  set(target, key, newVal) {
    target[key] = newVal;
    trigger(target, key)
  }
})

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

effect(() => {
  console.log(obj.foo);
}, {
  // 调度器可以控制副作用函数的触发时机
  scheduler(fn) {
    // 将副作用函数放入宏任务队列里
    setTimeout(fn)
  }
})

obj.foo ++

console.log('结束了')