# Lab1 Phase 1：SVG 编辑器（CLI）

## 架构方案（实施初稿）

TypeScript 面向对象；CLI → application → domain，infrastructure 实现 application 定义的 DocumentStore 端口。
domain 不依赖终端、Node 文件系统或 XML 库。main 只装配依赖。

Command 封装编辑操作，Composite 统一叶子/容器，Memento 保存文档前后快照。
按名字分派只集中在 CommandDispatcher 与 ShapeFactory；两处内置清单记为后续外部注册机制的待重构点。
图形通过多态公开只读属性投影与摘要，序列化不新增类型分派。

计划阶段：工程与模型 → 最小 CLI 闭环 → 编辑历史 → 六类型与结构编辑 → SVG 读写 → 回归和文档。

## 过程记录

- 2026-10-26：用户先请求需求分析与计划，随后明确委托实现，补充提交方式为“一份含 Git 仓库地址的 README.md”。
- 当前记录由 AI 协作开发过程产生；不将 AI 自查冒充学生独立发现的问题。
- 创建工程与严格类型检查配置，尚未声称任何功能或测试已完成。

## 一致性自查

实现过程中持续核对，最终收尾填写实际结果。

## 质量保证手段

计划覆盖模型、命令历史、失败原子性、XML 往返、真实 CLI 脚本回放与架构依赖检查。
