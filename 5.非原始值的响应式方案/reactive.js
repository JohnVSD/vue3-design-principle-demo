// 唯一key标示，用于建立 fon...in 和副作用函数的响应式联系
const ITERATE_KEY = Symbol();

// 副作用函数
let activeEffect;
let effectStack = [];
export function effect(fn, options = {}) {
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

// ===================================以下是数据代理==================================================

/**
 * 将非原始类型数据变为响应式数据
 * > 5.5 深响应
 * @param {object} obj - 
 * @return {Proxy} -
 */ 
export function reactive(obj) {
  return createReactive(obj)
}

/**
 * 5.5 浅响应
 * @param {object} obj - 
 * @return {Proxy} -
 */ 
export function shallowReactive(obj) {
  return createReactive(obj, true)
}

/**
 * 5.6 深只读
 * @param {object} obj - 
 * @return {Proxy} -
 */ 
export function readonly(obj) {
  return createReactive(obj, false, true)
}

/**
 * 5.6 浅只读
 * @param {object} obj - 
 * @return {Proxy} -
 */ 
export function shallowReadonly(obj) {
  return createReactive(obj, true, true)
}

/**
 * 5.5 将非原始类型数据变为响应式数据
 * @param {object} obj - 
 * @param {boolean} isShallow 5.5增加参数 是否浅响应，默认为 false，即非浅响应
 * @param {boolean} isReadonly 5.6增加参数 是否只读数据，默认为 false，即非只读
 * @return {Proxy} -
 */ 
export function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    // 拦截读取操作
    get(target, key, receiver) {
      console.warn('------ Proxy get');
      // 5.4.2 代理对象可以通过 raw 属性返回原始对象
      if (key === 'raw') {
        return target;
      }

      // 5.6 非只读数据时才需要建立响应式联系
      if (!isReadonly) {
        track(target, key);
      }

      // 5.5 得到原始值结果
      const res = Reflect.get(target, key, receiver)

      // 5.5 如果是浅响应则直接返回结果
      if (isShallow) {
        return res;
      }

      if (typeof res === 'object' && res !== null) {
        // 5.5 调用 reactive 将结果包装成响应式数据并返回
        // 5.6 如果数据是只读，则调用 readonly 对值进行包装
        return isReadonly ? readonly(res) : reactive(res);
      }

      return res;
    },
    // 拦截设置操作
    set(target, key, newVal, receiver) {
      console.warn('------ Proxy set');
      
      // 5.6 如果是只读的，则打印警告信息并返回
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的`)
        return true
      }

      // 5.4.1 获取旧值
      const oldVal = target[key];

      const type = Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD'

      // 设置属性值
      const res = Reflect.set(target, key, newVal, receiver)

      // 5.4.2 target === receiver.raw 说明 receiver 就是target的代理对象 (避免代理作为另一个代理原型导致的多次触发响应式的情况)
      if (target === receiver.raw) {
        // 5.4.1 比较新旧值，只有当它们不全等，并且不都是 NaN 时才触发响应 (NaN === NaN 是 false)
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal) ) {
          trigger(target, key, type)
        }
      }
      
      return res
    },
    // 拦截 in 操作符：'foo' in obj
    has(target, key) {
      console.warn('------ Proxy has');
      track(target, key)

      return Reflect.has(target, key)
    },
    // 拦截 fon...in 循环
    ownKeys(target) {
      console.warn('------ Proxy ownKeys');
      // 将副作用函数与 ITERATE_KEY 关联。因为此操作不像get可以获取到具体key值，这里只可以获取到原始对象。
      // 这也是合理的，因为在读取属性的时候总是能知道当前操作的是哪一个属性，所以只需要在该属性与副作用函数之间建立联系即可
      // 而 ownKeys 用来获取一个对象的所有属于自己的键值，这个操作明显不与任何具体键进行绑定，因此我们只能构造一个“唯一key”作为标识
      // 也可以理解为我们要为整个 for...in 这个操作本身建立响应联系，而不是某一个key
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    // 拦截 delete 操作
    deleteProperty(target, key) {
      console.warn('------ Proxy delete');

      // 5.6 如果是只读的，则打印警告信息并返回
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的`)
        return true
      }

      // 检查备操作的属性是否是对象自己的属性
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      // 使用 Reflect.deleteProperty 完成属性的删除
      const res = Reflect.deleteProperty(target, key)

      if (res && hadKey) {
        // 只有当被删除的属性是对象自己的属性并且成功删除时，才触发更新
        trigger(target, key, 'DELETE')
      }

      return res
    },
  })
}