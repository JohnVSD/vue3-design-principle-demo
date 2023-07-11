// # 3.2 初始渲染器

const vnode = {
  tag: 'div',
  children: [
    {
      tag: 'H2',
      children: '二级标题'
    },
    {
      tag: 'p',
      children: '文本内容',
      props: {
        onClick: () => {alert('hello')}
      },
    }
  ]
}

/**
 * 简版渲染器
 * @param {object} vnode 虚拟 DOM 对象
 * @param {object} container 真实 DOM 元素，作为挂载点
 * @return {void}
 */ 
function renderer(vnode, container) {
  if (typeof vnode.tag === 'string') {
    // 等于 string 说明 vnode 描述的是标签元素
    mountElement(vnode, container);
  } else if (typeof vnode.tag === 'function') {
    // 说明 vnode 描述的是组件
    mountComponent(vnode, container);
  }
}

// 挂载 DOM
function mountElement(vnode, container) {
  // todo 1 使用 vnode.tag 作为标签名创建 DOM 元素
  const el = document.createElement(vnode.tag);

  // todo 2 遍历 vnode.props 将属性、事件添加到 DOM 元素上
  for (const key in vnode.props) {
    if (/^on/.test(key)) {
      // 如果以 on 开头说明它是事件
      el.addEventListener(
        key.substr(2).toLowerCase(), // 将 onClick 转换为 click
        vnode.props[key] // 事件处理函数
      )
    }
  }

  // todo 3 处理 children
  if (typeof vnode.children === 'string') {
    // 如果 children 是字符串，说明它是元素的文本子节点
    el.appendChild(document.createTextNode(vnode.children));
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => renderer(child, el));
  }

  // todo 4 将元素添加到挂载点下
  container.appendChild(el);
}

// renderer(vnode, document.body);