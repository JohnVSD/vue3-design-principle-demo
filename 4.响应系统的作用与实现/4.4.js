// 4.4 分支切换与cleanup

// 1 优化注册副作用函数机制
let acvtiveEffect;
function effect(fn) {
  const effectFn = () => {
    acvtiveEffect = effectFn;
    // * 每次注册先清理历史数据，全新的函数
    cleanup(effectFn)

    fn();
  }

  // 用来存储所有与当前副作用函数相关联的依赖集合
  effectFn.deps = []
  
  effectFn()
}

// * 清空副作用函数关联依赖集合
function cleanup(effectFn) {
  for (let i = 0; i<effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0
}

// 2 依赖收集与关联
let bucket = new WeakMap();
// 原始数据
const data = {
  ok: true, 
  text: 'Hello world!' 
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
  console.log('trigger：', effects);
  // 避免无限执行
  const effectsToRun = new Set(effects) // 新增
  effectsToRun.forEach(effectFn => effectFn()) // 新增
  // effects && effects.forEach(fn => fn()) 删除
}

effect(() => {
  console.log('effect run');
  // * 这就是分支切换问题，本章节要解决这个问题
  document.body.innerText = obj.ok ? obj.text : 'not'
})

console.log(bucket);

setTimeout(() => {
  obj.ok = false
  console.log(bucket);
}, 2000);