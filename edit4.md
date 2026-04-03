# edit4.md —— 增量式构建与交互式内存图（Interactive & Incremental Graph）

## 📌 核心痛点
当前的 Visualizer 属于“快照式渲染”，导致节点在 Step 切换时频繁消失、重建，缺乏连续性。同时缺乏动画和操作焦点。
**目标：引入 `GraphStore`，实现基于 Heap（堆内存）的“增量式构建”，并增加 React Flow 的交互动画与当前节点高亮。**

---

## 🚫 严格约束（不要动已有成果）
1. 保持 `InterpreterController.js` 的按行执行逻辑不变。
2. 保持左右拖拽的分栏布局、三大主题切换逻辑不变。
3. 保持 Timeline 记录快照的闭环逻辑不变。

---

## 🛠️ 任务一：Adapter 增加“对象唯一标识” (Object Identity)
为了让 React Flow 知道 Step 1 的 Node A 和 Step 2 的 Node A 是同一个东西，必须有稳定 ID。
* **修改 `Adapter.js`**：在解析复杂对象（如 TreeNode, ListNode）时，利用 JS 对象的引用特性或生成一个递增 ID 绑定在原始对象上。
* 在输出的 VisualState 中，确保每个被识别为树/链表节点的结构都带有一个全局唯一的 `id`（例如 `id: "obj_1"`）。

---

## 📦 任务二：新增 GraphStore (增量状态管理)
创建 `src/store/graphStore.js` (使用 Zustand)，作为 React Flow 的唯一数据源。

```javascript
// GraphStore 核心职责
- 维护全局唯一的 `nodes` 和 `edges` 数组。
- updateGraph(visualStructures, currentLine): 
  1. 遍历当前 step 的结构，如果 node id 存在则【更新】（如修改 val），如果不存在则【追加】（Append）。
  2. 永远不要轻易删除节点（模拟堆内存持久化），除非执行 Reset。
  3. 智能计算 Edge：根据当前所有节点的 left/right/next 重新生成带箭头的 edges。
```

---

## 🎨 任务三：重构 VisualizerView (React Flow 进阶)
订阅 `GraphStore` 的 `nodes` 和 `edges`，并开启高级交互。

### 1. 节点持续存在与可拖拽
* 确保 React Flow 的 `nodes` 使用 GraphStore 里的持久化数据。
* 开启 `nodesDraggable={true}`，让用户可以自由拖拽整理这棵树。

### 2. 动画与视觉增强 (Animations)
* **节点生成 (Fade-in)**：给自定义节点组件 (Custom Node) 最外层套上简单的 CSS 动画（如 `@keyframes fadeIn` 或 Framer Motion）。
* **连线动画**：配置所有生成的 Edges 默认带有 `animated: true` 属性，并且使用 `markerEnd` 加上箭头。

### 3. ⭐ 当前执行节点高亮 (Active Highlight)
* **逻辑**：在 `updateGraph` 时，对比上一帧和这一帧的数据。如果某个 Node 是**刚刚被创建**的，或者它的**内部值（val/left/right）刚刚被修改**，给这个 Node 打上一个 `isActive: true` 的标记。
* **UI 表现**：在自定义节点中读取 `data.isActive`。如果为 true，为其添加极其醒目的发光描边（例如 Tailwind 的 `ring-4 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]`），并在 1-2 步之后自动褪去高亮。

---

## 🚀 执行指令 (给 Claude Code)
1. 创建并完善 `src/store/graphStore.js`，实现 Diff 与增量合并逻辑。
2. 优化 `Adapter.js` 以提供稳定的对象 ID。
3. 升级 `VisualizerView.jsx`，接管 GraphStore 数据，开启拖拽、连线动画，并实现极其酷炫的“活跃节点高亮”效果。
4. **验证**：运行 `sortedArrayToBST` 代码。现在每次 Step，节点应该是一个一个“蹦”出来并持久留在画面上的，连线带动画，且正在操作的节点会发光。
5. **收尾**：按规范在 `logs/` 目录下生成 `TaskLog.md`。