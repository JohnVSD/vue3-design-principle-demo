// 4.5 嵌套的 effect 和 effect 栈

// 1 优化注册副作用函数机制
let acvtiveEffect;
// * 副作用函数执行栈
let effectStack = [];
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)

    acvtiveEffect = effectFn;
    // * 将当前执行函数压入栈
    effectStack.push(acvtiveEffect);

    fn();

    // * 当前函数执行完毕后弹出栈
    effectStack.pop();
    // * 当前函数指向栈结构最后一项
    acvtiveEffect = effectStack[effectStack.length - 1]
  }

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
  foo: true, 
  bar: true
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
  if (!acvtiveEffect) return target[key];

  let depsMap = bucket.get(target)
  if(!depsMap){
    bucket.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  deps.add(acvtiveEffect)
  acvtiveEffect.deps.push(deps)
}

// 触发依赖
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return;
  const effects = depsMap.get(key)

  const effectsToRun = new Set(effects)
  effectsToRun.forEach(effectFn => effectFn())
}

let temp1, temp2
effect(function effect1() {
  console.log('effect 1 to run');

  effect(function effect2() {
    console.log('effect 2 to run');

    temp2 = obj.bar
  })

  temp1 = obj.foo
})

setTimeout(() => {
  obj.bar = false
}, 2000);