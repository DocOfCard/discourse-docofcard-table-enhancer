import { apiInitializer } from "discourse/lib/api";

function boolValue(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value).toLowerCase() !== "false";
}

function positiveNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function safeSize(value) {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  return /^(?:auto|fit-content|max-content|min-content|0|\d+(?:\.\d+)?(?:px|%|em|rem|vw))$/i.test(text)
    ? text
    : null;
}

function safeBorderWidth(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const text = String(value).trim();
  return /^\d+(?:\.\d+)?(?:px)?$/i.test(text)
    ? (/[a-z%]/i.test(text) ? text : `${text}px`)
    : null;
}

function applyColumnWidths(table, widths) {
  table.querySelector(":scope > colgroup.doc-table-colgroup")?.remove();
  if (!widths.length) {
    table.classList.remove("doc-table--custom-widths");
    return;
  }

  const colgroup = document.createElement("colgroup");
  colgroup.className = "doc-table-colgroup";
  const columnCount = Math.max(table.rows[0]?.cells.length || 0, widths.length);

  for (let index = 0; index < columnCount; index++) {
    const col = document.createElement("col");
    if (widths[index]) {
      col.style.width = `${widths[index]}px`;
      col.style.minWidth = `${widths[index]}px`;
    }
    colgroup.append(col);
  }

  table.prepend(colgroup);
  table.classList.add("doc-table--custom-widths");
}

function prepareWrapper(table) {
  const parent = table.parentElement;
  if (parent?.classList.contains("fullscreen-table-wrapper")) {
    parent.classList.add("doc-table-scroll");
    return parent;
  }
  if (parent?.classList.contains("doc-table-scroll")) {
    return parent;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "doc-table-scroll";
  table.before(wrapper);
  wrapper.append(table);
  return wrapper;
}

function applyWrapperOverrides(wrapper, config) {
  if (!config) {
    return;
  }

  const values = {
    "--doc-table-container-width": safeSize(config.dataset.themeContainerWidth || config.dataset.themeWidth),
    "--doc-table-container-max-width": safeSize(config.dataset.themeContainerMaxWidth || config.dataset.themeMaxWidth),
    "--doc-table-width": safeSize(config.dataset.themeTableWidth),
    "--doc-table-min-width": safeSize(config.dataset.themeTableMinWidth),
    "--doc-table-outer-border-width": safeBorderWidth(config.dataset.themeBorderWidth),
    "--doc-table-outer-border-radius": safeSize(config.dataset.themeBorderRadius),
  };

  Object.entries(values).forEach(([name, value]) => {
    if (value) {
      wrapper.style.setProperty(name, value);
    }
  });
}

function enhanceTable(table) {
  const config = table.closest("[data-theme-doc-table]");
  if (!settings.auto_apply_all_tables && !config) {
    return;
  }

  table.dataset.docTableEnhanced = "true";
  table.classList.add("doc-table");

  table.classList.toggle("doc-table--zebra", boolValue(config?.dataset.themeZebra, settings.zebra_rows));
  table.classList.toggle("doc-table--hover", boolValue(config?.dataset.themeHover, settings.hover_highlight));
  table.classList.toggle("doc-table--sticky-header", boolValue(config?.dataset.themeStickyHeader, settings.sticky_header));
  table.classList.toggle("doc-table--sticky-first-column", boolValue(config?.dataset.themeStickyFirstColumn, settings.sticky_first_column));

  const rowHeight = positiveNumber(config?.dataset.themeRowHeight, settings.default_row_height);
  const minColumnWidth = positiveNumber(config?.dataset.themeMinColumnWidth, settings.default_min_column_width);

  table.style.setProperty("--doc-table-row-height", `${rowHeight}px`);
  table.style.setProperty("--doc-table-min-column-width", `${minColumnWidth}px`);
  table.style.setProperty("--doc-table-horizontal-align", config?.dataset.themeAlign || settings.default_horizontal_align);
  table.style.setProperty("--doc-table-vertical-align", config?.dataset.themeValign || settings.default_vertical_align);

  const widths = (config?.dataset.themeWidths || "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  applyColumnWidths(table, widths);

  const columnAlign = (config?.dataset.themeColumnAlign || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  columnAlign.forEach((align, index) => {
    table.querySelectorAll(`tr > :nth-child(${index + 1})`).forEach((cell) => {
      cell.style.textAlign = align;
    });
  });

  const wrapper = prepareWrapper(table);
  applyWrapperOverrides(wrapper, config);
}

function findComposerTextarea() {
  return document.querySelector("#reply-control textarea.d-editor-input, .composer-fields textarea.d-editor-input, textarea.d-editor-input");
}

function lineOffsets(text) {
  const lines = text.split("\n");
  const offsets = [];
  let cursor = 0;
  for (const line of lines) {
    offsets.push(cursor);
    cursor += line.length + 1;
  }
  return { lines, offsets };
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorLine(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function findCurrentTable(text, selectionStart) {
  const { lines, offsets } = lineOffsets(text);
  let lineIndex = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] <= selectionStart) {
      lineIndex = i;
    } else {
      break;
    }
  }

  const candidates = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (isTableLine(lines[i]) && isSeparatorLine(lines[i + 1])) {
      let end = i + 1;
      while (end + 1 < lines.length && isTableLine(lines[end + 1])) {
        end++;
      }
      candidates.push({ startLine: i, endLine: end });
    }
  }

  let table = candidates.find((item) => lineIndex >= item.startLine && lineIndex <= item.endLine);
  if (!table) {
    table = candidates.find((item) => item.startLine > lineIndex);
  }
  if (!table && candidates.length === 1) {
    table = candidates[0];
  }
  if (!table) {
    return null;
  }

  let wrapperStart = table.startLine - 1;
  while (wrapperStart >= 0 && lines[wrapperStart].trim() === "") {
    wrapperStart--;
  }

  const openMatch = wrapperStart >= 0
    ? lines[wrapperStart].match(/^\s*<div\s+([^>]*data-theme-doc-table[^>]*)>\s*$/i)
    : null;
  let closeLine = table.endLine + 1;
  while (closeLine < lines.length && lines[closeLine].trim() === "") {
    closeLine++;
  }
  const hasWrapper = Boolean(openMatch && closeLine < lines.length && /^\s*<\/div>\s*$/i.test(lines[closeLine]));

  return {
    ...table,
    start: offsets[table.startLine],
    end: offsets[table.endLine] + lines[table.endLine].length,
    hasWrapper,
    wrapperStartLine: hasWrapper ? wrapperStart : null,
    wrapperEndLine: hasWrapper ? closeLine : null,
    attributes: openMatch?.[1] || "",
    lines,
    offsets,
  };
}

function parseAttributes(source) {
  const result = {};
  const regex = /data-theme-([a-z0-9-]+)\s*=\s*"([^"]*)"/gi;
  let match;
  while ((match = regex.exec(source))) {
    result[match[1]] = match[2];
  }
  return result;
}

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function setTextareaValue(textarea, value, caret) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
}

function buildWrapper(attrs) {
  const ordered = [
    ["container-width", attrs["container-width"] || "fit-content"],
    ["table-width", attrs["table-width"] || "max-content"],
    ["border-width", attrs["border-width"] || "1"],
    ["border-radius", attrs["border-radius"] || "8px"],
    ["row-height", attrs["row-height"] || String(settings.default_row_height)],
    ["min-column-width", attrs["min-column-width"] || String(settings.default_min_column_width)],
    ["align", attrs.align || settings.default_horizontal_align],
    ["valign", attrs.valign || settings.default_vertical_align],
    ["widths", attrs.widths || ""],
    ["column-align", attrs["column-align"] || ""],
    ["zebra", attrs.zebra ?? String(settings.zebra_rows)],
    ["hover", attrs.hover ?? String(settings.hover_highlight)],
    ["sticky-header", attrs["sticky-header"] ?? String(settings.sticky_header)],
    ["sticky-first-column", attrs["sticky-first-column"] ?? String(settings.sticky_first_column)],
  ];

  return `<div data-theme-doc-table="true" markdown="1" ${ordered
    .filter(([, value]) => value !== "")
    .map(([name, value]) => `data-theme-${name}="${esc(value)}"`)
    .join(" ")}>`;
}

function showSettingsDialog(editor, tableInfo) {
  const existing = document.querySelector("dialog.doc-table-settings-dialog");
  existing?.remove();

  const attrs = parseAttributes(tableInfo.attributes);
  const dialog = document.createElement("dialog");
  dialog.className = "doc-table-settings-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="doc-table-settings-form">
      <header><h2>表格设置</h2></header>
      <div class="doc-table-settings-grid">
        <label>容器宽度<input name="container-width" value="${esc(attrs["container-width"] || "fit-content")}"></label>
        <label>表格宽度<input name="table-width" value="${esc(attrs["table-width"] || "max-content")}"></label>
        <label>外边框宽度<input name="border-width" value="${esc(attrs["border-width"] || "1")}"></label>
        <label>圆角<input name="border-radius" value="${esc(attrs["border-radius"] || "8px")}"></label>
        <label>最小行高<input name="row-height" type="number" min="24" max="160" value="${esc(attrs["row-height"] || settings.default_row_height)}"></label>
        <label>默认最小列宽<input name="min-column-width" type="number" min="40" max="800" value="${esc(attrs["min-column-width"] || settings.default_min_column_width)}"></label>
        <label>水平对齐<select name="align"><option value="left">左</option><option value="center">中</option><option value="right">右</option></select></label>
        <label>垂直对齐<select name="valign"><option value="top">上</option><option value="middle">中</option><option value="bottom">下</option></select></label>
        <label class="wide">各列宽度（逗号分隔，px）<input name="widths" value="${esc(attrs.widths || "")}" placeholder="260,180"></label>
        <label class="wide">各列对齐（逗号分隔）<input name="column-align" value="${esc(attrs["column-align"] || "")}" placeholder="left,center"></label>
      </div>
      <div class="doc-table-settings-checks">
        <label><input type="checkbox" name="zebra"> 隔行底色</label>
        <label><input type="checkbox" name="hover"> Hover 高亮</label>
        <label><input type="checkbox" name="sticky-header"> 固定表头</label>
        <label><input type="checkbox" name="sticky-first-column"> 固定第一列</label>
      </div>
      <footer>
        <button type="button" class="btn btn-default doc-table-settings-cancel">取消</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </footer>
    </form>`;

  const form = dialog.querySelector("form");
  form.elements.align.value = attrs.align || settings.default_horizontal_align;
  form.elements.valign.value = attrs.valign || settings.default_vertical_align;
  for (const name of ["zebra", "hover", "sticky-header", "sticky-first-column"]) {
    const fallback = name === "zebra" ? settings.zebra_rows : name === "hover" ? settings.hover_highlight : name === "sticky-header" ? settings.sticky_header : settings.sticky_first_column;
    form.elements[name].checked = boolValue(attrs[name], fallback);
  }

  dialog.querySelector(".doc-table-settings-cancel").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextAttrs = {};
    for (const name of ["container-width", "table-width", "border-width", "border-radius", "row-height", "min-column-width", "align", "valign", "widths", "column-align"]) {
      nextAttrs[name] = String(data.get(name) || "").trim();
    }
    for (const name of ["zebra", "hover", "sticky-header", "sticky-first-column"]) {
      nextAttrs[name] = String(form.elements[name].checked);
    }

    const currentText = editor.getText();
    const lines = currentText.split("\n");
    const wrapperOpen = buildWrapper(nextAttrs);
    let replacement;
    let startLine;
    let endLine;

    if (tableInfo.hasWrapper) {
      startLine = tableInfo.wrapperStartLine;
      endLine = tableInfo.wrapperEndLine;
      const tableLines = lines.slice(tableInfo.startLine, tableInfo.endLine + 1);
      replacement = [wrapperOpen, "", ...tableLines, "", "</div>"];
    } else {
      startLine = tableInfo.startLine;
      endLine = tableInfo.endLine;
      const tableLines = lines.slice(startLine, endLine + 1);
      replacement = [wrapperOpen, "", ...tableLines, "", "</div>"];
    }

    lines.splice(startLine, endLine - startLine + 1, ...replacement);
    const newText = lines.join("\n");
    const caret = lines.slice(0, startLine + replacement.length).join("\n").length;
    editor.setText(currentText, newText, caret);
    dialog.close();
  });

  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

function editorAdapter(toolbarEvent) {
  if (toolbarEvent?.getText && toolbarEvent?.replaceText) {
    return {
      getText: () => toolbarEvent.getText(),
      selectionStart: toolbarEvent.selected?.start ?? 0,
      setText(oldText, newText, caret) {
        toolbarEvent.replaceText(oldText, newText);
        toolbarEvent.selectText?.(caret, 0);
      },
      focus() {},
    };
  }

  const textarea = findComposerTextarea();
  if (!textarea) {
    return null;
  }

  return {
    getText: () => textarea.value,
    selectionStart: textarea.selectionStart || 0,
    setText(_oldText, newText, caret) {
      setTextareaValue(textarea, newText, caret);
    },
    focus: () => textarea.focus(),
  };
}

function openTableSettings(toolbarEvent) {
  const editor = editorAdapter(toolbarEvent);
  if (!editor) {
    window.alert("未找到 Markdown 编辑器，请切换到 Markdown 模式后重试。");
    return;
  }

  const text = editor.getText();
  const tableInfo = findCurrentTable(text, editor.selectionStart);
  if (!tableInfo) {
    window.alert("请先把光标放在要设置的 Markdown 表格中。");
    editor.focus();
    return;
  }

  showSettingsDialog(editor, tableInfo);
}

export default apiInitializer((api) => {
  api.decorateCookedElement(
    (element) => element.querySelectorAll("table").forEach(enhanceTable),
    { id: "docofcard-table-enhancer" }
  );

  api.onToolbarCreate((toolbar) => {
    toolbar.addButton({
      id: "doc-table-settings",
      group: "extras",
      icon: "gear",
      title: themePrefix("table_settings.title"),
      action: (toolbarEvent) => openTableSettings(toolbarEvent),
    });
  });

  api.addComposerToolbarPopupMenuOption({
    name: "doc-table-settings-fallback",
    icon: "gear",
    label: themePrefix("table_settings.title"),
    action: (toolbarEvent) => openTableSettings(toolbarEvent),
  });
});
