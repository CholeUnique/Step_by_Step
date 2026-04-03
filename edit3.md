# edit3.md —— 引入图形画布与指针连线（Graph & Pointers）+ 执行步进修复

---

## 📌 核心目标

将 `Visualizer.jsx` 从简单的“Flex 布局”重构为基于 **React Flow** 的“拓扑图画布”，并修复执行器 step 体验问题，实现：

* ✅ 真正节点连线（Pointers）
* ✅ 教科书级结构图（Tree / LinkedList）
* ✅ **正确的逐行执行体验（statement-level stepping）**

---

# 🛠️ 任务一：引入图形引擎

**致 Claude Code：**

1. 安装依赖：

```bash
npm install reactflow
```

2. 将 `Visualizer.jsx` 重构为使用：

* `ReactFlow`
* `Background`
* `Controls`

---

# 🎨 任务二：节点与连线逻辑（Node & Edge）

---

## 1️⃣ Nodes

* **每个对象/节点**：都是一个 React Flow 节点。
* 布局规则：

| 结构   | 布局 | 解释 |
| ---- | ---- | -- |
| 链表   | 水平 | x 增加，y 固定|
| 树    | 分层 （Top-Down）| 父节点在中心，左右子节点在下方两侧。|
| 普通变量 | 左侧 | 放在画布左侧的固定区域|

---

## 2️⃣ Edges（关键）

---

### 必须实现：

```text
next / left / right → edge
```

---

### 要求：

* **指针即连线**：如果一个对象的 `next`、`left` 或 `right` 属性指向另一个对象，必须生成一条 `edge`。
* **箭头样式**：连线末端必须带箭头，使用 `markerEnd` 属性。
* **连线标签**：在连线上方小字label标注 `next`、`left` 等属性名。

---

# 💅 任务三：视觉优化

---

* **自定义节点样式**：不要用 React Flow 默认的丑方框。请使用我们已有的 **Glassmorphism（玻璃拟物化）** 样式创建自定义节点组件（Custom Node）
* **背景网格**：给画布加上淡淡的点状背景网格（Background），增加专业感。
* **每次 step 后**：**自适应布局**，确保所有节点和连线都可见。

```js
reactFlowInstance.fitView()
```

---

# ⚠️ 任务四：修复 Step 执行体验（关键）

---

## ❗ 当前问题

* step 是 AST 粒度（不是按行）
* 导致：

  * 多次 step 停在同一行
  * 注释行“卡住”
  * 用户体验极差

---

## 🎯 目标

实现：

> ✅ **一次 step = 执行到下一行代码（statement-level stepping）**

---

## 🛠️ 必须实现逻辑（InterpreterController）

---

### 1️⃣ 获取当前行号

```js
function getCurrentLine(interpreter) {
  const state = interpreter.stateStack.at(-1);
  return state?.node?.loc?.start?.line;
}
```

---

### 2️⃣ 实现“跳到下一行”

```js
function stepToNextLine(interpreter) {
  const startLine = getCurrentLine(interpreter);

  let nextLine = startLine;

  while (interpreter.step()) {
    nextLine = getCurrentLine(interpreter);

    if (nextLine !== startLine) {
      break;
    }
  }

  return nextLine;
}
```

---

### 3️⃣ 替换原 step()

```js
controller.step = () => {
  const line = stepToNextLine(interpreter);

  // 更新 timeline
  captureState();

  return line;
};
```

---

## 🚫 禁止行为

* ❌ 不允许继续使用“单 AST step”
* ❌ 不允许 UI 每 step 都刷新（会闪烁）

---

## ✅ UI 更新策略

---

只在“行变化时”更新：

```js
if (lineChanged) {
  updateUI();
}
```

---

# ⚠️ 任务五：Babel 行号修复

---

## 问题

Babel 转译后：

```text
loc 信息可能错乱
```

---

## 解决

```js
Babel.transform(code, {
  presets: ["es2015"],
  sourceMaps: false,
  retainLines: true
});
```

---

# 🧪 验证要求（必须通过）

---

## 1️⃣ 栈代码测试

```js
var stack = [];
stack.push(1);
stack.push(2);
stack.pop();
```

---

👉 必须表现：

* 每次 step 跳到下一行
* 不停留在同一行

---

## 2️⃣ 树结构测试

```js
var tree = sortedArrayToBST([-10, -3, 0, 5, 9]);
```

---

👉 必须表现：

* React Flow 正确显示树
* 有左右连线

---

## 3️⃣ 链表测试

```js
var a = { val: 1 };
var b = { val: 2 };
a.next = b;
```

---

👉 必须表现：

* 节点 + next 指针

---

