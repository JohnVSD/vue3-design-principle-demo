/**
 * # 如何代理 object
 * object 的操作不只有 get、set 的操作，上一章是重点了解了响应式系统的主要实现逻辑，只用了get、set来进行演示；
 * 但要完整的代理object，需要的操作其实还有很多，如：fon...in、delete、判断一个对象上是否存在某个属性（key：key in obj）
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
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0
}

// 原始数据
const data = {
  foo: 1,
  bar: 2
};
// * 唯一key标示，用于建立 fon...in 和副作用函数的响应式联系
const ITERATE_KEY = Symbol()
const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key, receiver) {
    console.warn('Proxy get');
    track(target, key);
    return Reflect.get(target, key, receiver);
  },
  // 拦截设置操作
  set(target, key, newVal, receiver) {
    console.warn('Proxy set');
    // * 如果属性不存在则是新增属性，否则是设置已有属性
    const type = Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD'

    // 设置属性值
    // target[key] = newVal;
    const res = Reflect.set(target, key, newVal, receiver)

    // * 将 type 作为第三个参数传递给 trigger
    trigger(target, key, type)
    return res
  },
  // * 拦截 in 操作符：'foo' in obj
  has(target, key) {
    console.warn('Proxy has');
    track(target, key)

    return Reflect.has(target, key)
  },
  // * 拦截 fon...in 循环
  ownKeys(target) {
    console.warn('Proxy ownKeys');
    // 将副作用函数与 ITERATE_KEY 关联。因为此操作不像get可以获取到具体key值，这里只可以获取到原始对象。
    // 这也是合理的，因为在读取属性的时候总是能知道当前操作的是哪一个属性，所以只需要在该属性与副作用函数之间建立联系即可
    // 而 ownKeys 用来获取一个对象的所有属于自己的键值，这个操作明显不与任何具体键进行绑定，因此我们只能构造一个“唯一key”作为标识
    // 也可以理解为我们要为整个 for...in 这个操作本身建立响应联系，而不是某一个key
    track(target, ITERATE_KEY)
    return Reflect.ownKeys(target)
  },

  // * 拦截 delete 操作
  deleteProperty(target, key) {
    console.warn('Proxy delete >>>>>');
    // * 检查备操作的属性是否是对象自己的属性
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    // * 使用 Reflect.deleteProperty 完成属性的删除
    const res = Reflect.deleteProperty(target, key)

    if (res && hadKey) {
      // 只有当被删除的属性是对象自己的属性并且成功删除时，才触发更新
      trigger(target, key, 'DELETE')
    }

    return res
  },
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
function trigger(target, key, type) {
  const depsMap = bucket.get(target)
  if(!depsMap) return;
  const effects = depsMap.get(key)
  // * 取得与 ITERATE_KEY 相关联的副作用函数
  const iterateEffects = depsMap.get(ITERATE_KEY)

  const effectsToRun = new Set()
  // 因为读取和设置操作是在同一个副作用函数内进行的导致了递归执行；
  // 增加守卫条件避免递归，trigger 触发的副作用函数与当前正在执行的副作用函数相同，则不触发
  effects && effects.forEach(effectFn => {
    if (activeEffect !== effectFn) {
      effectsToRun.add(effectFn)
    }
  })
  
  console.log(type, key);
  // * 只有操作类型为 ADD 或 delete 时，才触发与 ITERATE_KEY 相关联的副作用函数重新执行
  if (type === 'ADD' || type === 'DELETE') {
    // * 将与 ITERATE_KEY 相关联的副作用函数也添加到 effectsToRun
    iterateEffects && iterateEffects.forEach(effectFn => {
      if (activeEffect !== effectFn) {
        effectsToRun.add(effectFn)
      }
    })
  }

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
  // 1. in 操作符
  // console.log('foo' in obj)

  // 2. for...in 操作符
  for(const key in obj) {
    console.log(key);
  }
})

setTimeout(() => {
  console.log('==================')
  // 添加新属性，会对 for...in 产生影响
  obj.name = '啦啦啦'
}, 500);

setTimeout(() => {
  console.log('==================')
  /**
   * 修改 foo 的值
   * 修改属性不应该对 for...in 产生影响，因为无论怎么修改一个属性的值，对于 for...in 循环来说都只会循环一次。
   * 所以在这种情况下，我们不需要触发副作用函数重新执行，否则会造成不必要的性能开销。
   * 然而无论是新增还是修改属性本质上都是 set 操作，所以需要修改 set 内部逻辑，使其能够区分新增、修改
   */
  obj.foo = 4
}, 1000);

setTimeout(() => {
  console.log('==================')
  // 删除值 delete
  delete obj.foo
}, 1500);