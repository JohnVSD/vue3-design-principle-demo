/**
 * todo 3.3 组件的本质
 */ 

// 模拟一个函数组件
const MyComponent = function () {
  return {
    tag: 'div',
    props: {
      onClick: () => {alert('hello')}
    },
    children: [
      {
        tag: 'H2',
        children: '我是一个组件'
      }
    ]
  }
}

const vNodeOfComponent = {
  tag: MyComponent
}

// 挂载组件
function mountComponent(vnode, container) {
  const subtree = vnode.tag();

  // 递归调用 renderer 渲染 subtree
  renderer(subtree, container);
}

renderer(vNodeOfComponent, document.body);
// 还可以扩展 对象组件...
// ? .vue 文件中的 <template>...</template> 就是一个组件，“编译器” 会将其编译成上方的 vnode 元素，然后再调用 “渲染器” 渲染成真实 DOM