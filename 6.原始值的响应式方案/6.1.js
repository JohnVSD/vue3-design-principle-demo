/**
 * # 引入 ref 的概念 
 * 由于 JavaScript 中的 Proxy 无法提供对原始值的代理；所以“原始值的响应式方案”需要单独处理。
 * 解决方案也比较简单，就是为原始值进行一层包裹即可，这就是 ref 的原理。
 * 原始值：String、Number、Boolean、Symbol、undefined、null 等
 */
import { effect } from "./reactive.js";
import { ref } from "./ref.js";

/**
 * * 6.1 
 */
{
  // let str = 'vue';
  // // 1.无法拦截对值的修改
  // str = 'vue3'

  // 2.使用一个非原始值去包裹，也就是 ref
  let str = ref('vue');

  effect(()=> {
    console.log('effect：', str.value)
  })

  setTimeout(() => {
    str.value = 'vue3'
  }, 1000);
}