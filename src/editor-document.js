import { getMarkdownSourceTokenRanges } from './markdown-source.js';

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'bullet',
  'numbered',
  'todo',
  'quote',
  'code',
  'divider',
]);

let nextBlockId = 1;

export function createEditorBlock(type = 'paragraph', text = '', options = {}) {
  const normalizedType = BLOCK_TYPES.has(type) ? type : 'paragraph';
  return {
    id: options.id || `block-${nextBlockId++}`,
    type: normalizedType,
    text: String(text ?? '').replace(/\r\n?/g, '\n'),
    checked: Boolean(options.checked),
    indent: Math.max(0, Math.min(6, Math.floor(Number(options.indent) || 0))),
    number: Math.max(1, Math.floor(Number(options.number) || 1)),
    language: String(options.language || '').trim(),
    fence: options.fence === '~~~' ? '~~~' : '```',
  };
}

export function parseMarkdownLine(line) {
  let match = line.match(/^(#{1,6})\s+(.*)$/);
  if (match) return createEditorBlock(`heading${match[1].length}`, match[2]);

  match = line.match(/^(\s*)[-+*]\s+\[([ xX])\]\s?(.*)$/);
  if (match) {
    return createEditorBlock('todo', match[3], {
      checked: match[2].toLowerCase() === 'x',
      indent: Math.floor(match[1].length / 2),
    });
  }

  match = line.match(/^(\s*)[-+*]\s+(.*)$/);
  if (match) {
    return createEditorBlock('bullet', match[2], {
      indent: Math.floor(match[1].length / 2),
    });
  }

  match = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
  if (match) {
    return createEditorBlock('numbered', match[3], {
      indent: Math.floor(match[1].length / 2),
      number: Number(match[2]),
    });
  }

  match = line.match(/^>\s?(.*)$/);
  if (match) return createEditorBlock('quote', match[1]);

  if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
    return createEditorBlock('divider');
  }

  return createEditorBlock('paragraph', line);
}

export function parseEditorDocument(source, { markdown = true } = {}) {
  const normalized = String(source ?? '').replace(/\r\n?/g, '\n');
  if (!markdown) {
    const blocks = normalized.split('\n').map((line) => createEditorBlock('paragraph', line));
    return blocks.length > 0 ? blocks : [createEditorBlock()];
  }

  const lines = normalized.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const fenceMatch = lines[index].match(/^\s{0,3}(```|~~~)\s*([^\s`]*)\s*$/);
    if (!fenceMatch) {
      blocks.push(parseMarkdownLine(lines[index]));
      continue;
    }

    const fence = fenceMatch[1];
    const codeLines = [];
    let closed = false;
    for (index += 1; index < lines.length; index += 1) {
      if (new RegExp(`^\\s{0,3}${fence}\\s*$`).test(lines[index])) {
        closed = true;
        break;
      }
      codeLines.push(lines[index]);
    }
    blocks.push(createEditorBlock('code', codeLines.join('\n'), {
      language: fenceMatch[2],
      fence,
    }));
    if (!closed) break;
  }

  return blocks.length > 0 ? blocks : [createEditorBlock()];
}

function serializeBlock(block, markdown) {
  const text = String(block.text ?? '').replace(/\r\n?/g, '\n');
  if (!markdown) return text;

  const indent = '  '.repeat(Math.max(0, Math.min(6, Number(block.indent) || 0)));
  switch (block.type) {
    case 'heading1': return `# ${text}`;
    case 'heading2': return `## ${text}`;
    case 'heading3': return `### ${text}`;
    case 'heading4': return `#### ${text}`;
    case 'heading5': return `##### ${text}`;
    case 'heading6': return `###### ${text}`;
    case 'bullet': return `${indent}- ${text}`;
    case 'numbered': return `${indent}${Math.max(1, Number(block.number) || 1)}. ${text}`;
    case 'todo': return `${indent}- [${block.checked ? 'x' : ' '}] ${text}`;
    case 'quote': return text.split('\n').map((line) => `> ${line}`).join('\n');
    case 'code': {
      const fence = block.fence === '~~~' ? '~~~' : '```';
      return `${fence}${block.language || ''}\n${text}\n${fence}`;
    }
    case 'divider': return '---';
    default: return text;
  }
}

export function serializeEditorDocument(blocks, { markdown = true } = {}) {
  const safeBlocks = Array.isArray(blocks) && blocks.length > 0 ? blocks : [createEditorBlock()];
  return safeBlocks.map((block) => serializeBlock(block, markdown)).join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isTableLine(raw) {
  const line = String(raw ?? '');
  if (/^\s*\|.+\|\s*$/.test(line)) return true;
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function isImageLine(raw) {
  return /^\s*!\[[^\]]*\]\([^)\s]+\)\s*$/.test(String(raw ?? ''));
}

function safePreviewSrc(href) {
  const value = String(href ?? '').trim();
  if (!value) return '';
  if (/^(?:https?:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
  return value;
}

/**
 * Structural kind of one hard source line for Classic typography
 * (active source keeps raw Markdown but uses the same visual scale).
 */
export function classicLineKind(line, { markdown = true } = {}) {
  const raw = String(line ?? '');
  if (!markdown) return 'paragraph';
  if (/^\s{0,3}(```|~~~)/.test(raw)) return 'fence';
  if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(raw)) return 'divider';
  if (isTableLine(raw)) return 'table';
  if (isImageLine(raw)) return 'image';
  const block = parseMarkdownLine(raw);
  return block.type || 'paragraph';
}

/** Walk a full document so fenced interiors stay `code`, not paragraphs. */
export function classicLineKinds(lines, { markdown = true } = {}) {
  const rows = Array.isArray(lines) ? lines : [];
  if (!markdown) return rows.map(() => 'paragraph');
  const kinds = [];
  let fence = null;
  for (const line of rows) {
    const raw = String(line ?? '');
    const marker = raw.match(/^\s{0,3}(```|~~~)/);
    if (fence) {
      const closed = Boolean(marker && marker[1] === fence && /^\s{0,3}(?:```|~~~)\s*$/.test(raw));
      kinds.push(closed ? 'fence' : 'code');
      if (closed) fence = null;
      continue;
    }
    if (marker) {
      kinds.push('fence');
      fence = marker[1];
      continue;
    }
    kinds.push(classicLineKind(raw, { markdown: true }));
  }
  return kinds;
}

function imagePreviewHtml(raw) {
  const match = String(raw ?? '').match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
  if (!match) return '';
  const src = safePreviewSrc(match[2]);
  if (!src) return inlineMarkdownToHtml(raw);
  return `<img class="classic-line-image" alt="${escapeHtml(match[1])}" src="${escapeHtml(src)}">`;
}

function tablePreviewHtml(raw) {
  const cells = String(raw ?? '').split('|').slice(1, -1).map((cell) => cell.trim());
  if (cells.length === 0) return escapeHtml(raw) || '<br>';
  if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    return '<span class="classic-line-table-rule" aria-hidden="true"></span>';
  }
  const html = cells
    .map((cell) => `<span class="classic-line-cell">${inlineMarkdownToHtml(cell)}</span>`)
    .join('');
  return `<span class="classic-line-table">${html}</span>`;
}

/**
 * Render one hard source line for Classic live preview (inactive lines).
 * Structural markers are shown as chrome; body text uses inline Markdown.
 */
export function classicLinePreviewHtml(line, { markdown = true, kind } = {}) {
  const raw = String(line ?? '');
  if (!markdown) {
    return raw ? escapeHtml(raw) : '<br>';
  }
  const resolved = kind || classicLineKind(raw, { markdown: true });
  if (resolved === 'fence') {
    return `<code class="classic-line-fence">${escapeHtml(raw)}</code>`;
  }
  if (resolved === 'code') {
    return `<code class="classic-line-code">${escapeHtml(raw) || ' '}</code>`;
  }
  if (resolved === 'divider') {
    return '<hr class="classic-line-hr" aria-hidden="true">';
  }
  if (resolved === 'table') {
    return tablePreviewHtml(raw);
  }
  if (resolved === 'image') {
    return imagePreviewHtml(raw) || inlineMarkdownToHtml(raw);
  }
  const block = parseMarkdownLine(raw);
  // Keep preview chrome lightweight (no nested font-size) so source/preview
  // rows of the same kind share the row's metrics and do not jump on flip.
  const body = inlineMarkdownToHtml(block.text || '');
  if (block.type.startsWith('heading')) {
    return body || '<br>';
  }
  if (block.type === 'bullet') {
    return `<span class="classic-line-bullet" aria-hidden="true">•</span> ${body || ''}`;
  }
  if (block.type === 'numbered') {
    return `<span class="classic-line-number" aria-hidden="true">${block.number}.</span> ${body || ''}`;
  }
  if (block.type === 'todo') {
    const mark = block.checked ? '☑' : '☐';
    return `<span class="classic-line-todo${block.checked ? ' is-checked' : ''}"><span class="classic-line-check" aria-hidden="true">${mark}</span> ${body || ''}</span>`;
  }
  if (block.type === 'quote') {
    return body || '<br>';
  }
  return body || '<br>';
}

export function classicLineSourceHtml(line, { highlight = false } = {}) {
  const raw = String(line ?? '');
  if (!highlight) return raw ? escapeHtml(raw) : '<br>';

  let cursor = 0;
  let html = '';
  for (const range of getMarkdownSourceTokenRanges(raw)) {
    if (range.start > cursor) html += escapeHtml(raw.slice(cursor, range.start));
    html += `<strong class="source-markup-token">${escapeHtml(raw.slice(range.start, range.end))}</strong>`;
    cursor = range.end;
  }
  if (cursor < raw.length) html += escapeHtml(raw.slice(cursor));
  return html || '<br>';
}

export function inlineMarkdownToHtml(value) {
  const placeholders = [];
  const hold = (html) => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(html);
    return token;
  };

  let output = escapeHtml(value);
  output = output.replace(/`([^`\n]+)`/g, (_match, text) => hold(`<code>${text}</code>`));
  output = output.replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (_match, alt, href) => {
    const src = safePreviewSrc(href);
    if (!src) return _match;
    return hold(`<img class="classic-line-image" alt="${alt}" src="${escapeHtml(src)}">`);
  });
  output = output.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_match, label, href) => {
    const safeHref = /^(?:https?:|mailto:|#|\.\.?\/)/i.test(href) ? href : '#';
    return hold(`<a href="${escapeHtml(safeHref)}">${label}</a>`);
  });
  output = output.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  output = output.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  output = output.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  output = output.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  output = output.replace(/\n/g, '<br>');
  output = output.replace(/\u0000(\d+)\u0000/g, (_match, index) => placeholders[Number(index)] || '');
  return output;
}

function markdownFromNode(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue || '';
  if (node.nodeType !== 1) return '';

  const tag = node.tagName.toLowerCase();
  const content = [...node.childNodes].map(markdownFromNode).join('');
  if (tag === 'br') return '\n';
  if (tag === 'strong' || tag === 'b') return content ? `**${content}**` : '';
  if (tag === 'em' || tag === 'i') return content ? `*${content}*` : '';
  if (tag === 's' || tag === 'strike' || tag === 'del') return content ? `~~${content}~~` : '';
  if (tag === 'code') return content ? `\`${content.replace(/`/g, '\\`')}\`` : '';
  if (tag === 'a') {
    const href = node.getAttribute('href') || '';
    return content && href ? `[${content}](${href})` : content;
  }
  if (tag === 'div' || tag === 'p') return `${content}\n`;
  return content;
}

export function editableHtmlToMarkdown(element) {
  return [...(element?.childNodes || [])]
    .map(markdownFromNode)
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/\n+$/g, '');
}

export function getEditorDocumentStats(source) {
  const plainText = String(source ?? '').replace(/\r\n?/g, '\n');
  const lines = plainText.length === 0 ? 1 : plainText.split('\n').length;
  const words = plainText.trim() ? plainText.trim().split(/\s+/u).length : 0;
  return {
    lines,
    words,
    characters: [...plainText].length,
  };
}

export function createEditorDocumentModel({
  source: initialSource = '',
  markdown: initialMarkdown = true,
  historyLimit = 150,
} = {}) {
  let markdown = initialMarkdown !== false;
  let blocks = parseEditorDocument(initialSource, { markdown });
  let cursor = null;
  let revision = 0;
  let disposed = false;
  const limit = Math.max(2, Math.floor(Number(historyLimit) || 150));
  let history = [serializeEditorDocument(blocks, { markdown })];
  let historyCursors = [null];
  let historyIndex = 0;
  let coalesceOpen = false;
  const subscribers = new Set();

  const serializeCurrent = () => serializeEditorDocument(blocks, { markdown });
  const publicBlock = (block) => Object.freeze({ ...block });
  let projection = null;
  let currentSnapshot = null;
  const refreshSnapshot = ({ structure = false, currentSource } = {}) => {
    if (structure || !projection) {
      const serialized = currentSource ?? serializeCurrent();
      projection = Object.freeze({
        source: serialized,
        blocks: Object.freeze(blocks.map(publicBlock)),
        stats: Object.freeze(getEditorDocumentStats(serialized)),
      });
    }
    currentSnapshot = Object.freeze({
      revision,
      markdown,
      ...projection,
      cursor: cursor ? Object.freeze({ ...cursor }) : null,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
    });
    return currentSnapshot;
  };
  refreshSnapshot({ structure: true, currentSource: history[0] });
  const source = () => projection.source;
  const snapshot = () => currentSnapshot;
  const publish = (options) => {
    const next = refreshSnapshot(options);
    subscribers.forEach((subscriber) => subscriber(next));
    return next;
  };
  const recordHistory = (current, cursor = null) => {
    if (history[historyIndex] === current) return false;
    history = history.slice(0, historyIndex + 1);
    historyCursors = historyCursors.slice(0, historyIndex + 1);
    history.push(current);
    historyCursors.push(cursor || null);
    if (history.length > limit) {
      history.shift();
      historyCursors.shift();
    }
    historyIndex = history.length - 1;
    return true;
  };
  const commit = (mutate, options = {}) => {
    if (disposed) return null;
    const result = mutate();
    if (result === false || result === null) return result;
    if (blocks.length === 0) blocks = [createEditorBlock()];
    const currentSource = serializeCurrent();
    const cursor = options.cursor || null;
    if (options.coalesce && coalesceOpen && historyIndex === history.length - 1) {
      history[historyIndex] = currentSource;
      historyCursors[historyIndex] = cursor;
    } else {
      if (options.coalesce && options.originCursor) {
        historyCursors[historyIndex] = options.originCursor;
      }
      recordHistory(currentSource, cursor);
      coalesceOpen = Boolean(options.coalesce);
    }
    revision += 1;
    publish({ structure: true, currentSource });
    return result;
  };
  const findIndex = (id) => blocks.findIndex((block) => block.id === id);
  const restoreHistory = (nextIndex, action, activeId = null) => {
    if (disposed) return { changed: false, action };
    const index = Math.min(Math.max(nextIndex, 0), history.length - 1);
    if (index === historyIndex) return { changed: false, action };
    const activeIndex = Math.max(0, findIndex(activeId));
    historyIndex = index;
    coalesceOpen = false;
    blocks = parseEditorDocument(history[index], { markdown });
    cursor = historyCursors[index] || cursor;
    revision += 1;
    publish({ structure: true });
    return {
      changed: true,
      action,
      focusId: blocks[Math.min(activeIndex, blocks.length - 1)].id,
      cursor: historyCursors[index] || null,
    };
  };
  const undo = (activeId = null) => restoreHistory(historyIndex - 1, 'undo', activeId);
  const redo = (activeId = null) => restoreHistory(historyIndex + 1, 'redo', activeId);

  const setCursor = (nextCursor) => {
    const next = nextCursor
      ? { line: Math.max(1, Math.floor(Number(nextCursor.line) || 1)), column: Math.max(1, Math.floor(Number(nextCursor.column) || 1)) }
      : null;
    if (cursor?.line === next?.line && cursor?.column === next?.column) return false;
    cursor = next;
    revision += 1;
    publish();
    return true;
  };

  const load = (nextSource = '', { markdown: nextMarkdown = markdown } = {}) => {
    if (disposed) return snapshot();
    markdown = nextMarkdown !== false;
    blocks = parseEditorDocument(nextSource, { markdown });
    cursor = null;
    history = [serializeCurrent()];
    historyCursors = [null];
    historyIndex = 0;
    coalesceOpen = false;
    revision += 1;
    return publish({ structure: true, currentSource: history[0] });
  };

  /** Replace document from full source text and record history (Classic surface). */
  const applySource = (nextSource = '', options = {}) => commit(() => {
    const normalized = String(nextSource ?? '').replace(/\r\n?/g, '\n');
    if (projection.source === normalized) return false;
    blocks = parseEditorDocument(normalized, { markdown });
    return true;
  }, {
    coalesce: Boolean(options.coalesce),
    cursor: options.cursor || null,
    originCursor: options.originCursor || null,
  });

  const subscribe = (subscriber) => {
    if (typeof subscriber !== 'function' || disposed) return () => {};
    subscribers.add(subscriber);
    subscriber(snapshot());
    return () => subscribers.delete(subscriber);
  };

  const dispose = () => {
    disposed = true;
    subscribers.clear();
  };

  return Object.freeze({
    snapshot,
    source,
    subscribe,
    load,
    applySource,
    undo,
    redo,
    setCursor,
    dispose,
  });
}
