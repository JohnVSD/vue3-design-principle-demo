// 4.3 设计一个完善的响应系统

// todo 1 注册副作用函数
let acvtiveEffect;
function effect(fn) {
  acvtiveEffect = fn;
  fn();
}

// 重新设计桶结构
let bucket = new WeakMap();
// 原始数据
const data = { 
  text: 'Hello world!' 
};
const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
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

    return target[key];
  },
  // 拦截设置操作
  set(target, key, newVal) {
    target[key] = newVal;
    
    const depsMap = bucket.get(target)
    if(!depsMap) return;
    const effects = depsMap.get(key)
    effects && effects.forEach(fn => fn())
  }
})

// * 可以传入匿名副作用函数
effect(() => {
  console.log('effect run');
  document.body.innerText = obj.text
})

setTimeout(() => {
  obj.text = '哈哈哈'
}, 2000);
setTimeout(() => {
  obj.name = 'wangchunewi'
  
  effect(() => {
    document.body.innerText = obj.name
  })
}, 4000);

console.log(bucket);