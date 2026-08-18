# DocOfCard Table Enhancer 2.0.5

基于 1.0.6 重做，保留原有表格增强功能，并加入无需轮询或 MutationObserver 的 Markdown 编辑器工具栏入口。

## v2.0.6

- 修复 Hover 高亮时单元格分隔线与背景色过于接近、看起来消失的问题。
- Hover 行使用更明显的分隔线颜色，并同步固定首列右侧分隔线。

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


## v2.0.5

- 覆盖 Discourse Core 对 `fullscreen-table-wrapper` 自带的 Hover 外围阴影和阴影过渡。
- 仅作用于已由本组件增强的 `.fullscreen-table-wrapper.doc-table-scroll`，不影响其他 Discourse 表格。
- 保留 v2.0.4 的隔行底色和鼠标悬停整行高亮。


## v2.0.4

- 恢复默认隔行底色，让相邻行保持轻微明暗差异，提升横向阅读辨识度。
- 恢复默认 Hover 整行高亮，鼠标移动到表格行时会有明显但克制的背景变化。
- 保留 v2.0.3 的浅灰表头、细边框、轻量圆角和左对齐整体风格。


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
