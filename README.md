# Step_by_Step
# JS 代码可视化工具（前端版）实现方案

## 一、项目目标（Objective）

构建一个**纯前端的 JavaScript 代码执行可视化工具**，核心能力包括：

* 逐步执行（step-by-step execution）
* 变量状态可视化
* 调用栈展示
* 执行时间线（timeline）
* 支持教学场景（初学者理解代码执行过程）

---

## 二、设计原则（Design Principles）

1. **可控执行优先**

   * 不依赖 `eval`
   * 不直接执行原生 JS 引擎

2. **可视化优先**

   * 所有执行过程必须可记录、可回放

3. **渐进增强**

   * 从 JS 子集开始实现
   * 不追求完整 JS 兼容

4. **安全性**

   * 防止死循环
   * 限制执行步数

---

## 三、总体架构（Architecture）

```text
Editor (Monaco)
    ↓
Parser (AST)
    ↓
Interpreter（核心执行引擎）
    ↓
Timeline（状态记录）
    ↓
Visualizer（React UI）
```

---

## 四、技术栈（Tech Stack）

### 前端

* React（UI 渲染）
* Zustand / Redux（状态管理）
* Monaco Editor（代码编辑器）

### AST 解析

* Acorn（轻量解析器）
  或
* Babel Parser（更强大）

### 工具库

* lodash.clonedeep（状态快照）
* immer（可选，管理不可变状态）

---

## 五、核心技术路线（Core Approach）

## ✅ 选择：AST + 自定义解释器（Interpreter）

### 原因：

* 可精确控制执行流程
* 支持逐步执行
* 易于记录状态变化
* 安全性高

---

## ❌ 不采用方案

### eval 执行

问题：

* 无法 step 执行
* 无法控制执行
* 不安全

---

### AST 插桩 + eval

问题：

* 控制粒度有限
* 函数调用和循环难处理
* 难构建调用栈

---

## 六、核心模块设计（Core Modules）

---

## 1️⃣ AST 解析模块

### 输入

```js
let a = 1;
```

### 输出

AST（抽象语法树）

---

## 2️⃣ Interpreter（执行引擎）

### 核心职责

* 遍历 AST
* 执行每个节点
* 管理作用域
* 管理调用栈

---

### 核心数据结构

#### Environment（作用域）

```ts
type Env = {
  vars: Record<string, any>
  parent?: Env
}
```

---

#### 调用栈（Call Stack）

```ts
type Frame = {
  env: Env
  returnValue?: any
}
```

---

#### 执行状态

```ts
type State = {
  stack: Frame[]
  currentLine: number
}
```

---

## 3️⃣ Timeline（时间线）

### 目的

记录每一步执行状态

---

### 数据结构

```ts
type Step = {
  line: number
  stack: Frame[]
  envSnapshot: any
}
```

---

### 实现关键点

* 每一步执行后记录
* 使用 deep copy
* 防止引用污染

---

## 4️⃣ 执行控制（Execution Control）

支持：

```ts
nextStep()
prevStep()
run()
pause()
jumpTo(index)
```

---

## 5️⃣ 可视化模块（Visualizer）

### 需要展示的内容：

#### 变量区

```text
a: 1
b: [1,2]
```

---

#### 调用栈

```text
global
  ↳ foo()
```

---

#### 当前执行行

高亮代码行

---

#### 时间轴

* 类似视频进度条
* 支持拖动

---

## 七、Interpreter 实现细节（关键）

---

## 支持的 AST 节点（第一阶段）

只实现以下子集：

* VariableDeclaration
* Literal
* Identifier
* BinaryExpression
* ExpressionStatement
* AssignmentExpression
* CallExpression
* FunctionDeclaration
* ReturnStatement
* IfStatement

---

## 示例：变量声明

```ts
function evalVariableDeclaration(node, env) {
  const name = node.id.name
  const value = evalNode(node.init, env)
  env.vars[name] = value
}
```

---

## 示例：二元表达式

```ts
function evalBinary(node, env) {
  const left = evalNode(node.left, env)
  const right = evalNode(node.right, env)

  switch (node.operator) {
    case '+': return left + right
    case '-': return left - right
  }
}
```

---

## 示例：函数调用

```ts
function callFunction(fn, args, env) {
  const newEnv = createEnv(env)

  // 参数绑定
  fn.params.forEach((param, i) => {
    newEnv.vars[param.name] = args[i]
  })

  stack.push({ env: newEnv })

  evalNode(fn.body, newEnv)

  stack.pop()
}
```

---

## 八、关键难点（Important Challenges）

---

## 1️⃣ 作用域链（Scope Chain）

需要支持：

* lexical scope
* 闭包

---

## 2️⃣ Return 机制

需要实现：

* 中断执行
* 返回值传递

---

## 3️⃣ 死循环控制

方案：

* 最大执行步数限制（例如 10,000 步）
* 超出直接中断

---

## 4️⃣ 深拷贝性能

问题：

* timeline 会频繁复制数据

优化方向：

* 结构共享（高级阶段）
* diff-based snapshot

---

## 九、MVP 实现范围（强烈建议）

第一版本只支持：

```js
function add(a, b) {
  return a + b;
}

let x = add(1, 2);
```

---

## 功能：

* 变量变化
* 函数调用
* 调用栈变化
* step 执行

---

## 不做：

* class
* async / await
* this / prototype
* DOM API

---

## 十、扩展路线（Roadmap）

---

### Phase 1（MVP）

* 基础解释器
* timeline
* 简单 UI

---

### Phase 2

* 循环（for / while）
* object / array
* 更完整表达式支持

---

### Phase 3

* heap 可视化（对象引用图）
* diff 高亮
* 动画过渡

---

### Phase 4

* 多语言支持（可选）
* AI 解释每一步（增强学习体验）

---

## 十一、对 Claude Code 的提示（Prompt）

你可以给 Claude Code 这样的任务描述：

---

### Prompt 示例

> 实现一个简化版 JavaScript 解释器，用于代码执行可视化。
>
> 要求：
>
> 1. 使用 Acorn 解析 AST
> 2. 实现一个 Interpreter，支持：
>
>    * 变量声明
>    * 二元表达式
>    * 函数定义与调用
>    * return
> 3. 在执行过程中记录 timeline
> 4. 每执行一个 AST 节点，生成一个 step
> 5. 提供 nextStep / prevStep API
>
> 输出：
>
> * 可运行的 JS 模块
> * 清晰的模块划分（parser / interpreter / timeline）
> * 示例代码演示执行流程

---

## 十二、最终结论

这是一个**“解释器工程 + 可视化系统”项目**，本质上你在做：

> 一个“可控执行的 JavaScript 子集运行时 + 可视化引擎”

关键成功因素：

* 执行模型设计（最重要）
* timeline 结构
* UI 交互体验

---

