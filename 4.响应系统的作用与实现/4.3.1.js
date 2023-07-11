// 4.3 设计一个完善的响应系统

// todo 1 注册副作用函数
let acvtiveEffect;
function effect(fn) {
  acvtiveEffect = fn;
  fn();
}

// 创建一个桶结构，用于存储副作用函数
let bucket = new Set();
// 原始数据
const data = { text: 'Hello world!' };
const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
    if (acvtiveEffect) {
      bucket.add(acvtiveEffect)
    }
    console.log('读取：', bucket);
    return target[key];
  },
  // 拦截设置操作
  set(target, key, newValue) {
    target[key] = newValue;
    // 设置成功后，执行副作用函数
    bucket.forEach(fn => fn())

    return true
  }
})

effect(() => {
  console.log('effect run');
  document.body.innerText = obj.text
})

setTimeout(() => {
  obj.notExist = '一个不存在的属性'
}, 1000);