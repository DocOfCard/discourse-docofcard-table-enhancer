# DocOfCard Table Enhancer 2.0.3

基于 1.0.6 重做，保留原有表格增强功能，并加入无需轮询或 MutationObserver 的 Markdown 编辑器工具栏入口。

## 使用

1. 在 Markdown 编辑器中把光标放到目标表格任意一行。
2. 点击工具栏中的齿轮按钮“表格设置”。
3. 修改宽度、边框、圆角、行高、列宽、对齐、隔行底色、Hover、固定表头或固定第一列。
4. 保存后，组件会用 `data-theme-doc-table` 包裹该表格，配置随帖子 Markdown 保存。

如果屏幕较窄，按钮会同时出现在编辑器的“更多”菜单中，作为兼容入口。

## 说明

- 不使用持续 DOM 监听。
- 仅处理 Markdown 表格。
- 需要先把光标放在表格中；正文只有一张表时也会自动识别。
- 默认表格按内容宽度显示并居中。


## v2.0.3

- 调整默认 Markdown 表格视觉为更克制的原生风格：浅灰表头、细边框、正文白底和轻量圆角。
- 默认水平对齐改为左对齐，更接近常规 Markdown 表格阅读习惯。
- 默认关闭隔行底色和 Hover 高亮；相关开关仍完整保留，可按表格单独启用。
- 默认最小行高从 44px 微调为 42px，减少卡片感，同时保持可读性。
- 保留表格设置工具栏、列宽、固定表头/首列、移动端横向滚动等全部现有功能。

## v2.0.2

- 修复 Discourse v2026.8 自动注入 `themePrefix` 时的重复导入编译错误。


## v2.0.2

- Fixes the toolbar button doing nothing on Discourse v2026.8.
- Reads and updates composer content through the official toolbar event API instead of depending on textarea DOM selectors.
