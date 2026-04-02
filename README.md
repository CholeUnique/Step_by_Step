# Step_by_Step: JS 代码可视化工具（前端版）实现方案（优化版）

---

# 一、项目目标（Objective）

构建一个**纯前端 JavaScript 代码执行可视化工具**，基于 `JS-Interpreter` 实现安全执行与状态捕获，并通过现代 UI 进行动态展示。

## 核心能力

* 基于 `JS-Interpreter` 实现 **可控逐步执行（step execution）**
* 构建 **执行时间线（timeline）**
* 实现：
  * 变量状态可视化
  * 调用栈展示
  * 执行步骤回放（forward / backward）
* 提供动态内存图（可视化）与传统调用栈（变量监视）的双核展示。
* UI 达到现代产品级（非教学 demo）, 提供现代化、高交互的 UI 界面，融合 Apple/Microsoft 设计语言。

---

# 二、核心设计原则（必须遵守）

## 1️⃣ 单向数据流（非常重要）

```text
Code → Interpreter → Adapter → Timeline → UI
```

禁止：

* UI 直接读取 Interpreter 内部结构
* UI 直接操作执行状态

---

## 2️⃣ Interpreter 与 UI 解耦

必须通过 **Adapter 层** 转换数据：

```text
JS-Interpreter（复杂内部结构）
        ↓
Adapter（统一结构）
        ↓
Timeline（可序列化）
        ↓
UI
```

---

## 3️⃣ Timeline 是唯一数据源

UI 只依赖：

```ts
currentStepIndex
timeline[]
```

---

# 三、技术栈规范（Tech Stack Constraints ⚠️ 必须遵守）

为保证项目一致性与可执行性，必须严格使用以下技术栈，不允许擅自替换或升级为其他方案（例如 TypeScript）。

---

## 1️⃣ 基础框架

* 使用 **Vite** 初始化项目
* 使用 **React（函数式组件）**
* **必须使用 JavaScript（ESM）**，禁止使用 TypeScript

---

## 2️⃣ 状态管理

* 使用 **Zustand**
* 所有执行状态（timeline / currentStep / status）必须存储在 Zustand 中
* UI 不允许维护独立执行状态

---

## 3️⃣ 执行引擎

* 使用 `js-interpreter`
* 不允许：

  * 使用 eval
  * 手写 AST 解释器
  * 使用其他执行引擎替代

---

## 4️⃣ 编辑器

* 使用 `@monaco-editor/react`
* 不允许替换为其他编辑器（如 CodeMirror）

---

## 5️⃣ UI 与样式

* 使用 **TailwindCSS**
* 必须实现：

  * 大圆角（>=16px）
  * backdrop-filter 毛玻璃效果
  * transition 动画

---

## 6️⃣ 布局系统

* 使用以下之一实现拖拽分栏：

  * `react-split-pane`
  * 或 `allotment`

---

## 7️⃣ 可视化（预留）

* 动画：Framer Motion（后续阶段）
* 图结构：React Flow（后续阶段）

---

## 8️⃣ 项目结构约束（必须遵守）

必须按以下目录结构组织代码：

```text
src/
  core/
    InterpreterController.js
    Adapter.js
  store/
    timelineStore.js
  components/
    (UI组件)
  App.jsx
```

---

## 9️⃣ 代码规范约束

* 使用 ES Module（import/export）
* 禁止使用 class（除非必要）
* 优先函数式写法
* 所有模块必须职责单一（单一职责原则）

---

## 🔟 强约束（非常重要）

* ❌ 禁止使用 TypeScript
* ❌ 禁止 UI 直接访问 interpreter
* ❌ 禁止跳过 Adapter 层
* ❌ 禁止在 UI 中写执行逻辑

---

# 结论

> 本项目是一个 **纯 JavaScript + React 的执行可视化系统**，核心在于执行链路，而不是 UI 技术炫技。

---

# 四、系统架构（Architecture）
我们采用**单向数据流**与**三层架构**，UI 绝对禁止直接操作底层执行状态！

```text
Monaco Editor (用户输入)
      ↓
JS-Interpreter (核心引擎，AST解析与模拟执行)
      ↓
Execution Controller (封装 step 控制)
      ↓
Adapter (🚨 核心关键层：清洗晦涩数据)
      ↓
Timeline Store (Zustand，唯一可信数据源)
      ↓
React UI (只负责根据 timeline 渲染视图)
```

---

# 五、核心模块拆分（必须按此拆）

---

## 1️⃣ InterpreterController（执行控制器）

### 职责

* 初始化 interpreter
* 控制 step 执行
* 控制运行状态

---

### API 设计（必须实现）

```ts
init(code: string): void
step(): boolean
run(): void
reset(): void
```

---

### 内部逻辑

```ts
function step() {
  const hasMore = interpreter.step()

  const snapshot = adapter.capture(interpreter)

  timeline.push(snapshot)

  return hasMore
}
```

---

## 2️⃣ Adapter（核心关键模块 ⚠️）

### 目的

将 JS-Interpreter 的内部结构转换为：

👉 **可视化友好 JSON 结构**

---

### 输出数据结构（统一标准）

```ts
type VisualState = {
  step: number
  line: number | null
  variables: Record<string, any>
  callStack: string[]
}
```

---

### 必须实现方法

```ts
capture(interpreter): VisualState
```

---

### 必须处理的问题

#### 1. 变量提取

```ts
interpreter.globalScope.properties
```

⚠️ 必须转换：

```ts
pseudo → native
```

---

#### 2. 调用栈提取

```ts
interpreter.stateStack
```

转换为：

```ts
["global", "add()"]
```

---

#### 3. 数据转换（关键）

```ts
function toNative(value) {
  return interpreter.pseudoToNative(value)
}
```

---

## 3️⃣ Timeline Store（Zustand 状态管理）
管理由 Adapter 生成的历史快照，控制 UI 回放。

---

### 数据结构

```ts
type Store = {
  timeline: VisualState[]
  currentStep: number

  setTimeline: (t: VisualState[]) => void
  next: () => void
  prev: () => void
  jump: (i: number) => void
}
```

---

## 4️⃣ Execution State Machine（执行状态机 ⚠️）

必须实现：

```ts
type Status =
  | "idle"
  | "running"
  | "paused"
  | "finished"
```

---

### 状态转换

```text
idle → running
running → paused
running → finished
paused → running
finished → idle（reset）
```

---

### UI 控制规则

| 状态       | Run | Step | Reset |
| -------- | --- | ---- | ----- |
| idle     | ✅   | ❌    | ❌     |
| running  | ⏸   | ❌    | ❌     |
| paused   | ▶   | ✅    | ✅     |
| finished | 🔁  | ❌    | ✅     |

---

# 六、UI/UX 规范（强化版）

## 1️⃣ 整体视觉风格
* **设计语言**：拟物玻璃化（Glassmorphism），所有面板必须使用大圆角（Border Radius >= 16px）并利用 CSS `backdrop-filter` 实现毛玻璃半透明效果。
* **主题系统**：Header 右侧提供一个“笑脸”Icon，点击可在以下 3 套现代主题间无缝切换：
  * `Cupertino Light`（苹果原生浅色：纯白、磨砂灰、低饱和蓝）
  * `Fluent Dark`（微软深色：深灰背板、亚克力半透明侧边栏）
  * `Vercel Black`（极客黑：纯黑背景、高对比度白字、霓虹点缀）

## 2️⃣ 布局结构(Layout)
整体分为三大核心区域，左区和右区中间必须有**可拖拽的分隔条（Resizer）**。

```text
Header (顶部导航：左侧项目名，右侧笑脸主题切换)
  ↓
Main Split (左右拖拽容器)
  ├── Left: Toolbar (顶部) + Code Editor (主体)
  └── Right:
        ├── Visualizer 现代化图形区（上）
        └── Watch Panel 传统监视区（下，可上下拖拽调整比例）
```



## 3️⃣ 左侧：编辑器与工具栏交互

* **编辑器强约束 (Monaco Editor)**：
  * 必须自带完美的语法高亮（`class`, `function`, `true`, `for`, `var` 等关键字必须与普通代码颜色区分）。
  * 必须显示行号，支持当前执行行的高亮（用于动画定位）。
  * 必须支持 Tab / Shift+Tab 缩进与换行自动对齐缩进。
* **工具栏 (Toolbar) 状态机**：
  * 包含图标按钮：`运行`、`单步调试`、`单步跳出`、`逐过程`、`直接到结尾`、`重启`、`结束运行`。
  * **未运行态**：“运行”按钮为**红色**，其余所有按钮置灰不可点击。
  * **运行态**：点击后，“运行”按钮变为**绿色**（或变为暂停态），解除对其他合法按钮的封印（恢复高亮），允许点击单步调试。
  * *(注：为保证第一阶段稳定性，`单步跳出`和`逐过程`按钮在 UI 上展示，但功能可先做 Toast 提示“敬请期待”，重点跑通 `单步调试`)*

## 4  右侧：可视化与数据监视
* **上方：现代可视化区**：大圆角背景，准备接入 React Flow 展示数组、链表现代化图形。
* **下方：传统监视抽屉**：以 JSON Tree 的形式实时展示当前环境的 `Variables`（变量名与值）和 `Call Stack`（调用栈），必须与上方数据绝对同步。


* 所有面板必须 **圆角（>= 16px）**
* 使用 **CSS backdrop-filter 实现玻璃效果**
* 禁止使用默认 HTML button 样式
* 所有交互必须带 transition



## 5 编辑器（必须）

使用：

```bash
@monaco-editor/react
```

必须支持：

* 语法高亮
* 行号
* 当前行高亮（用于执行定位）


## 6  Toolbar（强约束）

按钮：

* Run / Pause
* Step
* Reset

⚠️ 第一阶段禁止实现：

* Step Over
* Step Out

（JS-Interpreter 不支持，避免误导）

---

# 七、执行流程（完整数据流）

---

## 用户点击 Step：

```text
UI → step()
   → interpreter.step()
   → adapter.capture()
   → timeline.push()
   → UI re-render
```

---

## 用户点击 Run：

```text
loop step() until:
  - 执行结束
  - 或达到 step limit（例如 1000）
```

---

# 八、MVP 范围（严格限制）

---

## 支持代码

```js
function add(a, b) {
  return a + b;
}

let x = add(1, 2);
```

---

## 必须完成

* 搭建极具质感的分栏 UI、三大主题切换
* 跑通工具栏按钮红绿联动状态机
* 实现单步执行（Step Into）的基础闭环：点击 Step -> 引擎跑一行 -> Adapter 提取变量 -> 右侧下方 Watch Panel 的 JSON 树完美更新
* step 执行
* timeline 生成
* 变量展示（JSON Tree）
* 调用栈展示
* 支持如下 JS 子集：变量声明 (`let/const`)、基础算术运算、简单函数定义与调用

---

## 明确不做

* 暂不处理 async / await
* class  实例化
* DOM API
* this / prototype
* 复杂对象图

---

# 九、关键工程约束（非常重要）

---

## 1️⃣ 最大执行步数

```ts
MAX_STEPS = 1000
```

防止死循环

---

## 2️⃣ 所有状态必须可序列化

禁止：

* function
* class instance

---

## 3️⃣ Timeline 不可变

必须：

```ts
newArray = [...oldArray, newStep]
```

---


# 最终结论

当前最优策略：

> **使用 JS-Interpreter + Adapter + Timeline 架构，优先完成执行闭环，再逐步增强可视化能力**

这是一个：

👉 **“执行控制系统 + 状态记录系统 + 可视化系统”三层架构项目**

---
