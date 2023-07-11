//* 4.2 响应式数据的基本实现

// 创建一个桶结构，用于存储副作用函数
let bucket = new Set();
// 原始数据
const data = { text: 'Hello world!' };
const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
    bucket.add(effect)
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

// 副作用函数
function effect() {
  document.body.innerText = obj.text
}
// ! 期待：修改 obj.text 时，副作用函数 effect 再次执行

// 触发读取操作
effect();

// 触发设置
setTimeout(() => {
  obj.text = '什么鬼？？'
}, 2000)

