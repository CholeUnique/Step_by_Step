# edit2.md —— ES6 支持 + 数据结构可视化升级方案

---

# 一、目标（本次升级）

解决两个核心问题：

---

## 1️⃣ 支持 ES6 用户代码（必须，用Babel转译）
**用户可以写：**

* 默认参数
* 箭头函数
* let / const

**当前问题：**

* JS-Interpreter 不支持 ES6
* 导致代码报错（默认参数 / 箭头函数等）

---

## 2️⃣ 实现真正“结构级可视化”（树/栈/队列/数组/链表）

**必须支持以下数据结构：**

* binary tree（树）
* stack（栈）
* queue（队列）
* linked list（链表）
* array（数组）
* object（对象）

---

# 二、总体架构升级

```text
User Code (ES6)
      ↓
Babel 转译（ES6 → ES5）
      ↓
JS-Interpreter 执行
      ↓
Adapter（已有）
      ↓
VisualizerAdapter（结构识别）
      ↓
React Flow 渲染（树）
```

---

# 三、ES6 → ES5 自动转换（必须实现）

---

## 新增依赖

```bash
npm install @babel/standalone
```

---

## 新增模块

```text
src/core/codeTransformer.js
```

---

## 实现

```js
import * as Babel from "@babel/standalone";

export function transformCode(code) {
  try {
    const result = Babel.transform(code, {
      presets: ["es2015"]
    });
    return result.code;
  } catch (e) {
    console.error("Babel transform error:", e);
    return code;
  }
}
```

---

## 修改 InterpreterController

```js
import { transformCode } from "./codeTransformer";

function init(code) {
  const transformed = transformCode(code);
  interpreter = new Interpreter(transformed);
}
```

---

# 四、VisualizerAdapter（核心增强 ⚠️）

---
## 输入

```js
currentStep
previousStep
```

## 输出

```js
{
  structures: [
    {
      type: "array | stack | queue | tree | linkedlist | object",
      name,
      value,
      meta
    }
  ]
}
```

---
# 五、结构识别规则（必须实现）

---

## 1️⃣ Array（基础）

```js
Array.isArray(value)
```

---

## 2️⃣ Stack（必须）

---

### ❗不能依赖变量名

---

### 使用 diff 判断：

```js
prev: [1,2]
curr: [1,2,3]
→ push → stack
```

```js
prev: [1,2,3]
curr: [1,2]
→ pop → stack
```

---

## 规则：

```js
if (curr.length === prev.length + 1) → push
if (curr.length === prev.length - 1) → pop
```

---

👉 标记：

```js
type: "stack"
meta: { op: "push" | "pop" }
```

---

## 3️⃣ Queue（必须）

---

### 判断：

```js
prev: [1,2,3]
curr: [2,3]
→ shift → queue
```

---

规则：

```js
if (长度减少 且 第一个元素改变)
→ queue
```

---

👉 标记：

```js
type: "queue"
meta: { op: "shift" }
```

---

## 4️⃣ Linked List（必须）

---

## 判断结构：

```js
{
  val: 1,
  next: {...}
}
```

---

## 检测函数：

```js
function isLinkedList(node) {
  return (
    node &&
    typeof node === "object" &&
    "val" in node &&
    "next" in node
  );
}
```

---

👉 标记：

```js
type: "linkedlist"
```

---

## 5️⃣ Binary Tree（保持）

```js
{
  val,
  left,
  right
}
```

---

👉 标记：

```js
type: "tree"
```

---

## 6️⃣ Object（兜底）

```js
typeof value === "object"
```

---

# 六、可视化实现（必须）

---

## 1️⃣ Stack（LIFO）

```text
[3]
[2]
[1]
```

* 垂直排列
* 顶部为栈顶

---

## 2️⃣ Queue（FIFO）

```text
[1] → [2] → [3]
```

* 横向排列
* 左出右进

---

## 3️⃣ Array

```text
[1] [2] [3]
```

---

## 4️⃣ Linked List（关键）

```text
[1] → [2] → [3] → null
```

---

必须显示：

* 节点
* next 指针（箭头）

---

## 5️⃣ Tree（React Flow）

（沿用原 edit2）

---

# 七、Linked List → Flow（必须实现）

---

```js
function listToFlow(head) {
  const nodes = [];
  const edges = [];

  let current = head;
  let i = 0;

  while (current) {
    const id = String(i);

    nodes.push({
      id,
      data: { label: current.val },
      position: { x: i * 120, y: 0 }
    });

    if (current.next) {
      edges.push({
        id: id + "-" + (i + 1),
        source: id,
        target: String(i + 1)
      });
    }

    current = current.next;
    i++;
  }

  return { nodes, edges };
}
```

---

# 八、UI 行为要求

---

## 上半区域（Visualizer）

必须支持：

* tree → React Flow
* linked list → React Flow
* stack → vertical blocks
* queue → horizontal flow
* array → blocks

---

## 下半区域

保留 JSON（debug）

---

# 九、日志系统（必须）

---

每次运行生成：
（如果已经有当天的日志，直接追加）
```text
/logs/时间.md
```

---

## 新增内容

```md
## 新增能力
- ES6 自动转 ES5
- 树结构可视化
- 栈 / 队列识别（基于 diff）
- 链表结构识别与渲染
```

---

# 最终目标

> 让用户写任意 ES6 代码，并看到“真实数据结构图”而不是 JSON。

---
