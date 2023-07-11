/**
 * # 4.8 计算属性 computed 与 lazy 属性
 * e.g：
 * ```js
 * const obj = { 
 *    title: "Hello", 
 *    name: "world" 
 * }
 * computed(() => obj.foo + obj.name)
 * ```
 */

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
  for (let i = 0; i<effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0
}

/**
 * * New 计算属性
 * @param {Function} getter -
 */ 
function computed(getter) {
  // 缓存数据，值没有变的情况下，不用触发effect函数
  let value;
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler(fn) {
      dirty = true;
      console.log('computed scheduler 中：', obj)
      // * 触发 computed 本身的依赖集合执行
      trigger(obj, 'value')
    }
  })

  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
        // * 将 computed value 属性进行依赖追踪，避免外层 effect 嵌套调用无法触发执行的问题
        track(obj, 'value')
      }
      return value
    }
  }

  return obj;
}

// 原始数据
const data = {
  foo: 1,
  bar: 2
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

const objCount = computed(() => {
  return obj.foo + obj.bar
})

// ! 嵌套问题
effect(() => {
  console.log('effect 中调用computed:', objCount.value)
})

setTimeout(() => {
  console.log('=======')
  obj.foo++
}, 1000);