/**
 * # 4.9 watch 的实现原理
 * e.g：
 * ```js
 * 本质是观测响应式数据
 * watch(obj, (newVal, oldVal) => {
 *    console.log('数据变了')
 * })
 * obj.foo++ // 修改响应式数据，触发 watch 回调执行
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
 * * New watch 侦听器
 * @param {Function} getter -
 */ 
function watch(source, cb) {
  let getter;
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue;
  // ! 新值和旧值交换没理解太清楚
  const job = () => {
    // 在 scheduler 中重新执行副作用函数，得到的是新值
    newValue = effectFn();
    cb(newValue, oldValue);
    // 更新旧值
    oldValue = newValue
  }
  
  const effectFn = effect(
    () => getter(),
    {
      lazy: true,
      scheduler() {
          job();
      }
    }
  );

  oldValue = effectFn();
}

// * 递归将对象中所有属性访问一遍
function traverse(value, seen = new Set()){
  // 如果读取的是原始值，或者已经被读过了，那就什么都不做
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  // 将数据添加到 seen 中，代表遍历的读取过了，避免循环引用引起的死循环
  seen.add(value)
  for (const key in value) {
    traverse(value[key], seen)
  }

  return value
}

// 原始数据
const data = {
  foo: 1,
  bar: 2,
  items: {
    title: '啦啦啦'
  }
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

// 1. 传入响应式对象
// watch(obj, () => {
//   console.log('watch 对象变化：');
// })

// 2. 传入 getter 函数
// watch(
//   () => obj.foo + obj.bar,
//   () => {
//     console.log('watch getter 函数变化：');
//   }
// )

// 3. 支持 newValue 和 oldValue
watch(() => obj.foo,
  (newValue, oldValue) => {
    console.log(newValue, oldValue);
  }
)

setTimeout(() => {
  obj.foo++
}, 1000);

// setTimeout(() => {
//   console.log('修改 bar');
//   obj.bar++
// }, 2000);

// setTimeout(() => {
//   console.log('修改子属性');
//   obj.items.title = '斤斤计较'
// }, 3000);