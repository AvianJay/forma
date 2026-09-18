import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Braces,
  Check as CheckIcon,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  GalleryHorizontalEnd,
  GripVertical,
  Layers,
  LayoutTemplate,
  Link2,
  LoaderCircle,
  Minus,
  MousePointer2,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  childNames,
  countComponents,
  createChild,
  designSchema,
  draftDesignSchema,
  initialDesign,
  issuesFrom,
  MAX_BODY_BYTES,
  normalizeMediaUrl,
  payloadSchema,
  type Child,
  type Design,
  type Issue,
} from '../shared/design';
import { Preview } from '../shared/Preview';
import { Check, ComponentFields, Field } from './Fields';

const DRAFT_KEY = 'forma:draft:v1';
const serialize = (design: Design) => JSON.stringify({ component: design.component }, null, 2);
const icons = {
  10: Type,
  9: LayoutTemplate,
  12: GalleryHorizontalEnd,
  14: Minus,
  1: MousePointer2,
};
const managerId = /^\/manage\/([A-Za-z0-9]{10})$/.exec(location.pathname)?.[1];
const managerToken = managerId
  ? new URLSearchParams(location.hash.slice(1)).get('token') || ''
  : '';
function readDraft() {
  if (managerId)
    return {
      design: structuredClone(initialDesign),
      raw: serialize(initialDesign),
      mode: 'visual' as const,
    };
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    const parsed = draftDesignSchema.safeParse(saved?.design);
    const design = parsed.success ? parsed.data : structuredClone(initialDesign);
    if (
      saved?.design &&
      typeof saved.design.title === 'string' &&
      typeof saved.design.description === 'string'
    ) {
      design.title = saved.design.title;
      design.description = saved.design.description;
      if (typeof saved.design.image === 'string') design.image = saved.design.image;
    }
    const raw = typeof saved?.raw === 'string' ? saved.raw : serialize(design);
    return {
      design,
      raw,
      mode:
        saved && (!parsed.success || saved.mode === 'json')
          ? ('json' as const)
          : ('visual' as const),
    };
  } catch {
    return {
      design: structuredClone(initialDesign),
      raw: serialize(initialDesign),
      mode: 'visual' as const,
    };
  }
}
function jsonIssues(raw: string): Issue[] {
  try {
    const result = payloadSchema.safeParse(JSON.parse(raw));
    return result.success ? [] : issuesFrom(result.error);
  } catch {
    return [{ path: 'JSON', message: 'JSON 格式有誤，請檢查括號、逗號與引號。' }];
  }
}
function download(text: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const [draft] = useState(readDraft);
  const [design, setDesign] = useState<Design>(draft.design);
  const [raw, setRaw] = useState(draft.raw);
  const [mode, setMode] = useState<'visual' | 'json'>(draft.mode);
  const [mobileTab, setMobileTab] = useState('edit');
  const [selected, setSelected] = useState<number | null>(0);
  const [loading, setLoading] = useState(!!managerId);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [result, setResult] = useState<{ url: string; manageUrl?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const dirtyRef = useRef(false);
  const parsed = designSchema.safeParse(design);
  const rawIssues = jsonIssues(raw);
  const validation = [...(parsed.success ? [] : issuesFrom(parsed.error)), ...rawIssues].filter(
    (issue, i, list) =>
      list.findIndex((v) => v.path === issue.path && v.message === issue.message) === i,
  );
  const bodyBytes = new TextEncoder().encode(JSON.stringify(design)).byteLength;
  if (bodyBytes > MAX_BODY_BYTES)
    validation.push({ path: 'design', message: '設計內容超過 64 KiB。' });
  const componentCount = countComponents(design.component);
  const disabled =
    loading ||
    loadFailed ||
    deleted ||
    busy ||
    validation.length > 0 ||
    (!!managerId && !managerToken);

  useEffect(() => {
    if (!managerId) return;
    let ignore = false;
    fetch(`/api/links/${managerId}`)
      .then(async (response) => {
        const data = (await response.json()) as { error?: string; design?: unknown };
        if (!response.ok) throw new Error(data.error || '無法載入連結');
        const value = designSchema.parse(data.design);
        if (!ignore) {
          setDesign(value);
          setRaw(serialize(value));
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e.message);
          setLoading(false);
          setLoadFailed(true);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);
  useEffect(() => {
    if (managerId) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ design, raw, mode }));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [design, raw, mode]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (managerId && dirtyRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => {
    if (result) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [result]);
  useEffect(() => {
    if (deleteConfirm) deleteRef.current?.showModal();
    else deleteRef.current?.close();
  }, [deleteConfirm]);

  function update(next: Design) {
    setDesign(next);
    setRaw(serialize(next));
    dirtyRef.current = true;
    setError('');
  }
  function updateRaw(value: string) {
    setRaw(value);
    dirtyRef.current = true;
    try {
      const parsedPayload = payloadSchema.safeParse(JSON.parse(value));
      if (parsedPayload.success)
        setDesign((previous) => ({ ...previous, component: parsedPayload.data.component }));
    } catch {
      /* Keep the last renderable design while JSON is incomplete. */
    }
  }
  function updateChild(index: number, child: Child) {
    update({
      ...design,
      component: {
        ...design.component,
        components: design.component.components.map((c, i) => (i === index ? child : c)),
      },
    });
  }
  function move(index: number, offset: number) {
    const list = [...design.component.components];
    [list[index], list[index + offset]] = [list[index + offset], list[index]];
    update({ ...design, component: { ...design.component, components: list } });
    setSelected(index + offset);
  }
  function reorder(from: number, to: number, pos: 'above' | 'below') {
    if (from === to) return;
    const list = [...design.component.components];
    const [item] = list.splice(from, 1);
    const insertIndex = from < to 
      ? (pos === 'above' ? to - 1 : to)
      : (pos === 'above' ? to : to + 1);
    list.splice(insertIndex, 0, item);
    update({ ...design, component: { ...design.component, components: list } });
    setSelected(insertIndex);
  }
  function add(type: Child['type']) {
    update({
      ...design,
      component: {
        ...design.component,
        components: [...design.component.components, createChild(type)],
      },
    });
    setSelected(design.component.components.length);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast('已複製到剪貼簿');
    } catch {
      setToast('無法使用剪貼簿，請選取網址手動複製。');
    }
  }
  async function publish() {
    if (disabled || !parsed.success) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(managerId ? `/api/links/${managerId}` : '/api/links', {
        method: managerId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(managerId ? { Authorization: `Bearer ${managerToken}` } : {}),
        },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        error?: string;
        issues?: Issue[];
        url?: string;
        manageUrl?: string;
      };
      if (!response.ok)
        throw new Error(
          [data.error, ...(data.issues || []).map((i: Issue) => `${i.path}: ${i.message}`)].join(
            '\n',
          ),
        );
      if (!data.url) throw new Error('伺服器未回傳連結，請稍後再試');
      setDesign(parsed.data);
      setRaw(serialize(parsed.data));
      dirtyRef.current = false;
      setResult({ url: data.url, manageUrl: data.manageUrl || location.href });
    } catch (e) {
      setError(e instanceof Error ? e.message : '發布失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!managerId || !managerToken) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/links/${managerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      if (!response.ok) throw new Error(((await response.json()) as { error: string }).error);
      dirtyRef.current = false;
      setDeleted(true);
      setDeleteConfirm(false);
      setToast('短連結已刪除');
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗');
      setDeleteConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BODY_BYTES) {
      setError('匯入檔案不可超過 64 KiB');
      return;
    }
    updateRaw(await file.text());
    setMode('json');
    setToast('已載入 JSON，請確認驗證結果');
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span>
            forma<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="brand-divider" />
        <span className="topbar-title">Discord 卡片設計器</span>
        <span className="version-tag">COMPONENTS V2</span>
        <a
          className="docs-link"
          href="https://github.com/discord/discord-api-docs/blob/anthony%2Fembed-unfurl-components/developers%2Flink-previews%2Fcomponent-embeds.mdx"
          target="_blank"
          rel="noreferrer"
        >
          開發文件 <ArrowUpRight size={14} />
        </a>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> DISCORD COMPONENTS V2
            </div>
            <h1>{managerId ? '管理卡片內容' : '你的內容，值得更好的登場。'}</h1>
            <p>自由組合文字、媒體與按鈕，即時打造專屬卡片。</p>
          </div>
          <div className="heading-status">
            <ShieldCheck size={15} />
            無需註冊 · 即開即用
          </div>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {managerId && !managerToken && (
          <div className="notice error">缺少管理密鑰。請使用包含 #token 的完整私人管理連結。</div>
        )}
        {deleted && (
          <div className="notice">
            內容已刪除。<a href="/">建立新卡片 ↗</a>
          </div>
        )}
        {managerId && !deleted && (
          <div className="notice management">
            <Link2 size={16} />
            <span>
              正在管理{' '}
              <a href={`/s/${managerId}`} target="_blank" rel="noreferrer">
                /s/{managerId} ↗
              </a>
              。儲存即更新公開內容；Discord 預覽快取可能稍有延遲。
            </span>
          </div>
        )}
        <nav className="mobile-tabs" aria-label="工作區">
          <button
            className={mobileTab === 'edit' ? 'active' : ''}
            onClick={() => setMobileTab('edit')}
          >
            <Layers size={16} />
            編輯設計
          </button>
          <button
            className={mobileTab === 'preview' ? 'active' : ''}
            onClick={() => setMobileTab('preview')}
          >
            <Eye size={16} />
            即時預覽
          </button>
        </nav>
        <div className={`work-grid mobile-${mobileTab}`}>
          <section className="editor-panel">
            <div className="panel-bar">
              <div className="editor-tabs" role="tablist" aria-label="編輯模式">
                <button
                  role="tab"
                  aria-selected={mode === 'visual'}
                  className={mode === 'visual' ? 'active' : ''}
                  onClick={() => setMode('visual')}
                >
                  <Layers size={15} />
                  視覺編輯
                </button>
                <button
                  role="tab"
                  aria-selected={mode === 'json'}
                  className={mode === 'json' ? 'active' : ''}
                  onClick={() => setMode('json')}
                >
                  <Braces size={15} />
                  JSON
                </button>
              </div>
              <span className="save-status">
                <span className={storageFailed ? 'warning-dot' : ''} />
                {managerId ? '私人管理模式' : storageFailed ? '草稿儲存失敗' : '草稿已自動儲存'}
              </span>
            </div>
            <div className="editor-content" aria-busy={loading}>
              <fieldset
                className="editor-fieldset"
                disabled={loading || loadFailed || deleted || busy}
              >
                <details className="settings-block">
                  <summary>
                    <div>
                      <span className="settings-icon">
                        <LayoutTemplate size={17} />
                      </span>
                      <span>
                        預覽資訊<small>標題、說明與封面圖片</small>
                      </span>
                    </div>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="settings-fields">
                    <Field label="預覽標題">
                      <input
                        value={design.title}
                        maxLength={200}
                        onChange={(e) => update({ ...design, title: e.target.value })}
                      />
                    </Field>
                    <Field label="預覽描述">
                      <textarea
                        rows={2}
                        value={design.description}
                        maxLength={500}
                        onChange={(e) => update({ ...design, description: e.target.value })}
                      />
                    </Field>
                    <Field label="封面網址（選填）" hint="Discord CDN 封面也會自動套用媒體前綴。">
                      <input
                        type="url"
                        value={design.image || ''}
                        placeholder="https://…"
                        onChange={(e) => update({ ...design, image: e.target.value })}
                        onBlur={(e) =>
                          update({ ...design, image: normalizeMediaUrl(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                </details>
                {mode === 'visual' ? (
                  <>
                    <div className="container-settings">
                      <div className="section-label">
                        <span className="step-number">01</span>容器樣式
                      </div>
                      <div className="container-controls">
                        <label className="color-control">
                          <input
                            aria-label="容器色彩"
                            type="color"
                            value={`#${(design.component.accent_color ?? 0xbef264).toString(16).padStart(6, '0')}`}
                            onChange={(e) =>
                              update({
                                ...design,
                                component: {
                                  ...design.component,
                                  accent_color: parseInt(e.target.value.slice(1), 16),
                                },
                              })
                            }
                          />
                          <span>強調色</span>
                          <code>
                            {design.component.accent_color == null
                              ? '無'
                              : `#${design.component.accent_color.toString(16).padStart(6, '0').toUpperCase()}`}
                          </code>
                        </label>
                        <button
                          className="text-action"
                          onClick={() =>
                            update({
                              ...design,
                              component: { ...design.component, accent_color: null },
                            })
                          }
                        >
                          清除
                        </button>
                        <Check
                          label="隱藏內容"
                          checked={design.component.spoiler}
                          onChange={(spoiler) =>
                            update({ ...design, component: { ...design.component, spoiler } })
                          }
                        />
                      </div>
                    </div>
                    <div className="component-heading">
                      <div className="section-label">
                        <span className="step-number">02</span>組合你的內容
                      </div>
                      <span>{componentCount} / 40 元件</span>
                    </div>
                    <div className="component-list">
                      {design.component.components.map((child, index) => {
                        const Icon = icons[child.type];
                        const isDragging = dragIndex === index;
                        const isDropTarget = dragOverIndex === index && dropPosition;
                        return (
                          <article
                            className={`component-block ${selected === index ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? `drop-${dropPosition}` : ''}`}
                            key={index}
                            onDragOver={(e) => {
                              if (dragIndex === null || dragIndex === index) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              const rect = e.currentTarget.getBoundingClientRect();
                              const midY = rect.top + rect.height / 2;
                              const pos = e.clientY < midY ? 'above' : 'below';
                              if (dragOverIndex !== index || dropPosition !== pos) {
                                setDragOverIndex(index);
                                setDropPosition(pos);
                              }
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                if (dragOverIndex === index) {
                                  setDragOverIndex(null);
                                  setDropPosition(null);
                                }
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (dragIndex === null || dragIndex === index) {
                                setDragIndex(null);
                                setDragOverIndex(null);
                                setDropPosition(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const midY = rect.top + rect.height / 2;
                              const pos = e.clientY < midY ? 'above' : 'below';
                              reorder(dragIndex, index, pos);
                              setDragIndex(null);
                              setDragOverIndex(null);
                              setDropPosition(null);
                            }}
                          >
                            <div className="component-toolbar">
                              <div
                                className="drag-handle"
                                draggable
                                title="拖曳以排序"
                                aria-label={`拖曳排序元件 ${index + 1}`}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', String(index));
                                  e.dataTransfer.effectAllowed = 'move';
                                  const block = (e.currentTarget as HTMLElement).closest(
                                    '.component-block',
                                  ) as HTMLElement;
                                  if (block) {
                                    e.dataTransfer.setDragImage(block, 20, 20);
                                  }
                                  setDragIndex(index);
                                }}
                                onDragEnd={() => {
                                  setDragIndex(null);
                                  setDragOverIndex(null);
                                  setDropPosition(null);
                                }}
                              >
                                <GripVertical className="grip" size={15} />
                              </div>
                              <button
                                className="component-select"
                                aria-expanded={selected === index}
                                onClick={() => setSelected(selected === index ? null : index)}
                              >
                                <span className="component-icon">
                                  <Icon size={16} />
                                </span>
                                <span>{childNames[child.type]}</span>
                                <span className="component-index">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                              </button>
                              <div className="component-actions">
                                <button
                                  className="icon-button"
                                  aria-label={`上移元件 ${index + 1}`}
                                  title="上移"
                                  disabled={index === 0}
                                  onClick={() => move(index, -1)}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={`下移元件 ${index + 1}`}
                                  title="下移"
                                  disabled={index === design.component.components.length - 1}
                                  onClick={() => move(index, 1)}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={`複製元件 ${index + 1}`}
                                  title="複製"
                                  disabled={componentCount >= 40}
                                  onClick={() => {
                                    const list = [...design.component.components];
                                    list.splice(index + 1, 0, structuredClone(child));
                                    update({
                                      ...design,
                                      component: { ...design.component, components: list },
                                    });
                                    setSelected(index + 1);
                                  }}
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  className="icon-button danger"
                                  aria-label={`刪除元件 ${index + 1}`}
                                  title="刪除"
                                  onClick={() => {
                                    update({
                                      ...design,
                                      component: {
                                        ...design.component,
                                        components: design.component.components.filter(
                                          (_, i) => i !== index,
                                        ),
                                      },
                                    });
                                    setSelected(null);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            {selected === index && (
                              <div className="component-fields">
                                <ComponentFields
                                  component={child}
                                  onChange={(value) => updateChild(index, value)}
                                />
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    <div className="add-components">
                      <div>
                        <Plus size={14} />
                        新增元件
                      </div>
                      <div className="component-palette">
                        {([10, 9, 12, 14, 1] as const).map((type) => {
                          const Icon = icons[type];
                          return (
                            <button
                              key={type}
                              disabled={componentCount >= 40}
                              onClick={() => add(type)}
                            >
                              <Icon size={17} />
                              <span>{childNames[type]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="json-editor">
                    <div className="json-toolbar">
                      <span>component-embed.json</span>
                      <div>
                        <button className="text-action" onClick={() => fileInput.current?.click()}>
                          <Upload size={13} />
                          匯入
                        </button>
                        <button
                          className="text-action"
                          disabled={rawIssues.length > 0}
                          onClick={() =>
                            download(
                              JSON.stringify(payloadSchema.parse(JSON.parse(raw)), null, 2),
                              'component-embed.json',
                            )
                          }
                        >
                          <Download size={13} />
                          匯出
                        </button>
                      </div>
                    </div>
                    <textarea
                      aria-label="Component JSON"
                      value={raw}
                      onChange={(e) => updateRaw(e.target.value)}
                      spellCheck={false}
                    />
                    <p className="field-hint">
                      直接貼上 {'{ component: … }'}。驗證通過後會同步至視覺編輯器；未完成的 JSON
                      會保留。
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInput}
                  hidden
                  accept=".json,application/json"
                  onChange={importJson}
                />
              </fieldset>
              {validation.length > 0 && (
                <div className="validation" role="alert">
                  <strong>發布前，還有幾個地方需要調整</strong>
                  <ul>
                    {validation.slice(0, 8).map((issue, i) => (
                      <li key={i}>
                        <code>{issue.path}</code> {issue.message}
                      </li>
                    ))}
                  </ul>
                  {validation.length > 8 && <span>另有 {validation.length - 8} 個錯誤</span>}
                </div>
              )}
            </div>
            <div className="editor-footer">
              <span>
                <ShieldCheck size={14} />
                {managerId ? '已驗證管理權限' : '發布後取得專屬管理密鑰'}
              </span>
              <button
                className="text-action"
                onClick={() => {
                  setMode('json');
                  fileInput.current?.click();
                }}
                disabled={loading || deleted || busy}
              >
                <Upload size={13} />
                匯入 JSON
              </button>
            </div>
          </section>
          <aside className="preview-panel">
            <div className="preview-bar">
              <span>
                <Eye size={16} />
                即時預覽
              </span>
              <span className="live-pill">
                <i />
                LIVE
              </span>
            </div>
            <div className="preview-surface">
              <div className="channel-label">
                <span>#</span> 預覽頻道{' '}
                <span className="channel-icon">
                  <Layers size={14} />
                </span>
              </div>
              <div className="message">
                <div className="avatar">
                  F<span />
                </div>
                <div className="message-content">
                  <div className="message-author">
                    你的名字<span>今天 12:00</span>
                  </div>
                  <div className="sample-link">https://forma.link/s/your-idea</div>
                  <Preview component={design.component} />
                </div>
              </div>
              <div className="preview-note">
                <span />
                <span>Discord 預覽模擬，實際顯示以 Discord 為準。</span>
              </div>
            </div>
            <div className="publish-card">
              <div className="publish-icon">
                <Link2 size={23} />
              </div>
              <h2>準備發布</h2>
              <p>
                生成專屬網址，貼入 Discord 即可呈現卡片。
                <br />
                永久有效，無需註冊帳號。
              </p>
              <button className="publish-button" disabled={disabled} onClick={publish}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                {loading ? '載入設計中…' : managerId ? '儲存變更' : '生成短連結'}
                <ArrowUpRight size={18} />
              </button>
              <div className="publish-meta">
                <CheckIcon size={12} />
                公開展示頁<span>·</span>
                <CheckIcon size={12} />
                附管理憑證
              </div>
              {managerId && !deleted && (
                <button
                  className="delete-link"
                  disabled={busy || loading || loadFailed || !managerToken}
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={13} />
                  刪除此連結
                </button>
              )}
            </div>
            <div className="tip">
              <span>✦</span>
              <p>
                <strong>設計小技巧</strong>
                加入醒目標題、配圖或按鈕，讓卡片更具吸引力。
              </p>
            </div>
          </aside>
        </div>
        <footer className="page-footer">
          <span>FORMA · DISCORD COMPONENTS V2</span>
          <span>
            Cloudflare Workers <i /> Discord Components V2
          </span>
        </footer>
      </main>
      <dialog ref={dialogRef} className="result-dialog" onCancel={() => setResult(null)}>
        <button
          className="dialog-close icon-button"
          aria-label="關閉發布結果"
          onClick={() => setResult(null)}
        >
          <X size={18} />
        </button>
        <div className="success-icon">
          <CheckIcon size={25} />
        </div>
        <div className="eyebrow">READY TO SHARE</div>
        <h2>{managerId ? '已更新卡片內容' : '卡片已成功建立'}</h2>
        <p>將網址貼到 Discord 頻道，即可自動展開卡片。</p>
        {result && (
          <>
            <Field label="公開短連結">
              <div className="copy-field">
                <input readOnly value={result.url} onFocus={(e) => e.target.select()} />
                <button aria-label="複製短連結" onClick={() => copy(result.url)}>
                  <Copy size={17} />
                </button>
              </div>
            </Field>
            <a className="open-result" href={result.url} target="_blank" rel="noreferrer">
              開啟展示頁 <ExternalLink size={14} />
            </a>
            <div className="management-secret">
              <ShieldCheck size={19} />
              <div>
                <strong>保存你的私人管理連結</strong>
                <p>這是修改與刪除內容的唯一憑證。請妥善保存，勿公開分享；遺失後無法復原。</p>
              </div>
            </div>
            <div className="copy-field">
              <input
                aria-label="私人管理連結"
                readOnly
                value={result.manageUrl || ''}
                onFocus={(e) => e.target.select()}
              />
              <button aria-label="複製管理連結" onClick={() => copy(result.manageUrl || '')}>
                <Copy size={17} />
              </button>
            </div>
            <button
              className="publish-button"
              onClick={() =>
                download(
                  `Forma 私人管理連結（請勿公開）\n${result.manageUrl}\n\n公開短連結\n${result.url}\n`,
                  'forma-management.txt',
                  'text/plain',
                )
              }
            >
              <Download size={16} />
              保存管理連結
            </button>
            <p className="dialog-footnote">修改後，Discord 已有的預覽可能需要一段時間才會更新。</p>
          </>
        )}
      </dialog>
      <dialog ref={deleteRef} className="result-dialog" onCancel={() => setDeleteConfirm(false)}>
        <h2>刪除這個短連結？</h2>
        <p>公開展示頁將無法存取，這個動作無法復原。</p>
        <div className="dialog-actions">
          <button onClick={() => setDeleteConfirm(false)} disabled={busy}>
            保留連結
          </button>
          <button className="danger-button" onClick={remove} disabled={busy}>
            {busy ? '刪除中…' : '確認刪除'}
          </button>
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckIcon size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
