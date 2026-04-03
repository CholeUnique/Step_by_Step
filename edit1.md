# edit1.md —— 内存拓扑图（教科书级可视化）（Visualizer 重构方案）与日志系统升级

---

# 一、目标（必须明确）
1. **冻结非相关区域**：绝对禁止修改 `App.jsx` 的整体布局、`CodeEditor.jsx`、`Toolbar.jsx` 和 `WatchPanel.jsx`。
2. **重构 Visualizer**：将右上角的 `Visualizer.jsx` 从“简陋的变量卡片”彻底升级为“教科书式的动态数据结构图”（支持节点连线、数组区块、哈希表展示）。
当前右侧仅为 **JSON / 变量监视（传统调试视图）**，需要升级为：
> ✅ **“结构语义可视化系统（Semantic Visualizer）”**

即：

* 不只是“变量值”
* 而是：

  * 数据结构
  * 关系
  * 演化过程

3. **建立开发日志规范**：引入强制的本地 Markdown 日志记录机制。

---

## 🛠️ 任务一：工作流日志规范（Agent 行为约束）
**致 Claude Code**：从本次任务开始，每次你完成代码修改并验证成功后，**必须**在项目根目录的 `logs/` 文件夹下生成或追加一个日志文件。
* **文件命名**：`YYYY-MM-DD_TaskLog.md`（例如：`2026-04-03_TaskLog.md`）。
* **日志内容必须包含**：
  1. **时间**：精确到时分秒。
  2. **主要内容**：用一句话总结本次执行的任务。
  3. **新增/修改功能**：列出具体修改了哪些文件，新增了什么核心能力。

---

## 🎨 任务二：重构 Visualizer 数据结构可视化
我们需要像“Python Tutor”或经典教科书那样，把内存中的对象变成具象的图形。建议引入 `reactflow` 或使用 `Framer Motion` 配合 SVG 连线来实现。

### 1. 启发式对象识别 (Heuristics in Adapter)
在 `Adapter.js` 中，增强对复杂对象的解析能力，使其能向 `Visualizer` 传递“节点”与“边（指针）”的拓扑数据结构：
* **链表节点 (Linked List)**：如果对象包含 `val`/`value` 和 `next` 属性，将其识别为链表节点。
* **二叉树节点 (Binary Tree)**：如果对象包含 `val`/`value` 以及 `left`、`right` 属性，识别为树节点。
* **数组/栈/队列 (Array)**：识别为连续的内存块序列。
* **哈希表/普通对象 (Object)**：识别为 Key-Value 映射表。
### 2. UI 渲染规范 (Visualizer.jsx)
在 `Visualizer.jsx` 中，根据 Adapter 传来的拓扑数据绘制图形。所有图形必须符合已有的 **Glassmorphism（玻璃拟物化）** 和大圆角规范。

#### A. 数组 (Array)
* 渲染为一条水平相连的方块。
* 每个方块上方用淡色小字标注索引 (0, 1, 2...)，中间大字显示 Value。

#### B. 链表与树节点 (Node Graph)
* 必须渲染为分块的“卡片”。
  * 左半部分：背景略深，显示 `val` 的值。
  * 右半部分：背景略浅，显示 `next` 或 `left`/`right`，如果指向 `null`，显示接地符号或 `∅`。
  * **指针连线**：如果 `next` 指向另一个对象，**必须在两个卡片之间绘制一条带箭头的连线**。

#### C. 哈希表/字典 (Map/Object)
* 渲染为一个圆角表格（Grid），左列是 Key，右列是 Value。

### 3. 动画过渡 (Transition)
* 当 Timeline 步进（Step）时，如果有新建节点、变量值改变、或指针箭头重新指向另一个节点，必须使用动画平滑过渡（弹簧动画更佳），严禁生硬闪烁。

---


# 二、核心理念（非常重要）

## ❌ 当前问题

当前展示：

```text
a: [1,2,3]
stack: [1,2]
```

👉 本质是“调试器视角”

---

## ✅ 目标效果

要达到类似：

* 教科书
* 算法动画
* 数据结构图示

👉 即：

| 数据 | 展示方式         |
| -- | ------------ |
| 数组 | 横向方块         |
| 栈  | 垂直堆叠         |
| 队列 | FIFO 流动      |
| 对象 | key-value 盒子 |
| 树  | 节点 + 连线      |
| 引用 | 箭头           |

---

# 三、系统升级架构（只改右侧）

```text
Timeline（已有）
   ↓
VisualizerAdapter（新增）
   ↓
VisualizerState（结构语义）
   ↓
React Flow / UI 渲染
```

---

# 四、新增模块（必须创建）

```text
src/visualizer/
  VisualizerAdapter.js
  structureDetectors.js
  VisualizerView.jsx
```

---

# 五、核心机制：结构识别（关键）

## 目标

从 variables 中识别“数据结构语义”

---

## 示例输入

```js
{
  arr: [1,2,3],
  stack: [1,2],
  obj: {a:1,b:2}
}
```

---

## 输出（结构语义）

```js
[
  { type: "array", name: "arr", value: [1,2,3] },
  { type: "stack", name: "stack", value: [1,2] },
  { type: "object", name: "obj", value: {a:1,b:2} }
]
```

---

## 必须实现识别规则（MVP）

### 1️⃣ Array

```js
Array.isArray(value)
```

---

### 2️⃣ Stack（启发式）

```js
变量名包含 "stack"
或：
只发生 push/pop 行为（后续增强）
```

---

### 3️⃣ Queue

```js
变量名包含 "queue"
```

---

### 4️⃣ Object（HashMap）

```js
typeof value === "object"
```

---

### 5️⃣ Tree（后续）

通过：

```js
{ value, left, right }
```

结构识别

---

# 六、VisualizerAdapter（核心）

## 输入

```js
VisualState
```

---

## 输出

```js
VisualizerState = {
  structures: []
}
```

---

## 示例实现

```js
export function buildVisualizerState(visualState) {
  const vars = visualState.variables

  const structures = Object.entries(vars).map(([name, value]) => {
    if (Array.isArray(value)) {
      if (name.includes("stack")) {
        return { type: "stack", name, value }
      }
      if (name.includes("queue")) {
        return { type: "queue", name, value }
      }
      return { type: "array", name, value }
    }

    if (typeof value === "object") {
      return { type: "object", name, value }
    }

    return { type: "primitive", name, value }
  })

  return { structures }
}
```

---

# 七、可视化渲染规范（UI必须实现）

---

## 1️⃣ Array（横向）

```text
[1] [2] [3]
```

* 方块
* 横向排列
* 动画：变化高亮

---

## 2️⃣ Stack（纵向）

```text
[3]
[2]
[1]
```

* 自下向上堆叠
* 顶部高亮

---

## 3️⃣ Queue

```text
[1] → [2] → [3]
```

* 左进右出

---

## 4️⃣ Object

```text
a: 1
b: 2
```

* 卡片式展示

---

## 5️⃣ Primitive

```text
x = 3
```

---

# 八、动画要求（基础）

使用：

* Framer Motion（后续）
* 或 CSS transition（当前）

---

## 必须实现

* 新元素出现：fade-in
* 数值变化：高亮闪烁
* 结构变化：平滑过渡

---

# 九、与现有系统的关系（重要）

---

## ❗ 不允许修改

* InterpreterController
* Adapter
* Timeline Store

---

## ✅ 只做

```text
timeline → VisualizerAdapter → UI
```

---

# 十、UI替换规则

当前：

```text
右侧上半 = 空
右侧下半 = JSON
```

---

修改为：

```text
右侧上半 = Visualizer（结构图）
右侧下半 = Watch Panel（保留 JSON）
```

---

# 十一、开发顺序（必须遵守）

---

## Step 1

实现：

```js
buildVisualizerState()
```

---

## Step 2

console.log 验证结构识别

---

## Step 3

实现最简单 UI（div + flex）

---

## Step 4

再加动画

---

# 十二、日志系统（必须新增）

---

## 目录

```text
/logs/
```

---

## 每次运行必须生成：

```text
logs/2026-xx-xx-xx.md
```

---

## 内容格式

```md
# 工作日志

## 时间
2026-xx-xx xx:xx

## 本次目标
实现可视化结构系统

## 完成内容
- 新增 VisualizerAdapter
- 实现 array / stack / object 识别
- 替换右侧可视区

## 新增文件
- src/visualizer/VisualizerAdapter.js
- src/visualizer/VisualizerView.jsx

## 当前效果
- 数组以方块展示
- 栈以垂直结构展示

## 下步计划
- 增加 queue / tree 支持
- 引入动画
```

