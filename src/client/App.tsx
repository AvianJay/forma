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
  childName,
  countComponents,
  createChild,
  createInitialDesign,
  draftDesignSchema,
  getLocalizedSchemas,
  issuesFrom,
  localizedParseOptions,
  MAX_BODY_BYTES,
  normalizeMediaUrl,
  type Child,
  type Design,
  type Issue,
} from '../shared/design';
import { useI18n } from '../shared/I18nContext';
import { addLocaleParam, t as translate, type Locale } from '../shared/i18n';
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
function readDraft(locale: Locale) {
  const initialDesign = createInitialDesign(locale);
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
function jsonIssues(raw: string, locale: Locale): Issue[] {
  const { payloadSchema } = getLocalizedSchemas(locale);
  try {
    const result = payloadSchema.safeParse(JSON.parse(raw), localizedParseOptions(locale));
    return result.success ? [] : issuesFrom(result.error);
  } catch {
    return [{ path: 'JSON', message: translate(locale, 'json.invalid') }];
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

export function App({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const { t } = useI18n();
  const { designSchema, payloadSchema } = getLocalizedSchemas(locale);
  const [draft] = useState(() => readDraft(locale));
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
  const parsed = designSchema.safeParse(design, localizedParseOptions(locale));
  const rawIssues = jsonIssues(raw, locale);
  const validation = [...(parsed.success ? [] : issuesFrom(parsed.error)), ...rawIssues].filter(
    (issue, i, list) =>
      list.findIndex((v) => v.path === issue.path && v.message === issue.message) === i,
  );
  const bodyBytes = new TextEncoder().encode(JSON.stringify(design)).byteLength;
  if (bodyBytes > MAX_BODY_BYTES)
    validation.push({ path: 'design', message: t('validation.bodyTooLarge') });
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
    fetch(addLocaleParam('/api/links/' + managerId, locale))
      .then(async (response) => {
        const data = (await response.json()) as { error?: string; design?: unknown };
        if (!response.ok) throw new Error(data.error || t('error.loadLink'));
        const loaded = designSchema.safeParse(data.design, localizedParseOptions(locale));
        if (!loaded.success) throw new Error(t('error.loadLink'));
        const value = loaded.data;
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
      const parsedPayload = payloadSchema.safeParse(
        JSON.parse(value),
        localizedParseOptions(locale),
      );
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
    const insertIndex = from < to ? (pos === 'above' ? to - 1 : to) : pos === 'above' ? to : to + 1;
    list.splice(insertIndex, 0, item);
    update({ ...design, component: { ...design.component, components: list } });
    setSelected(insertIndex);
  }
  function add(type: Child['type']) {
    update({
      ...design,
      component: {
        ...design.component,
        components: [...design.component.components, createChild(type, locale)],
      },
    });
    setSelected(design.component.components.length);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(t('toast.copied'));
    } catch {
      setToast(t('toast.copyFailed'));
    }
  }
  async function publish() {
    if (disabled || !parsed.success) return;
    setBusy(true);
    setError('');
    try {
      const endpoint = managerId ? '/api/links/' + managerId : '/api/links';
      const response = await fetch(addLocaleParam(endpoint, locale), {
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
      if (!data.url) throw new Error(t('error.serverNoLink'));
      setDesign(parsed.data);
      setRaw(serialize(parsed.data));
      dirtyRef.current = false;
      setResult({ url: data.url, manageUrl: data.manageUrl || location.href });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.publish'));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!managerId || !managerToken) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(addLocaleParam('/api/links/' + managerId, locale), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      if (!response.ok) throw new Error(((await response.json()) as { error: string }).error);
      dirtyRef.current = false;
      setDeleted(true);
      setDeleteConfirm(false);
      setToast(t('toast.deleted'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.delete'));
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
      setError(t('validation.importTooLarge'));
      return;
    }
    updateRaw(await file.text());
    setMode('json');
    setToast(t('toast.jsonLoaded'));
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
        <span className="topbar-title">{t('app.topbarTitle')}</span>
        <span className="version-tag">COMPONENTS V2</span>
        <label className="language-select">
          <span className="sr-only">{t('language.label')}</span>
          <select
            aria-label={t('language.label')}
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
          >
            <option value="zh-Hant">{t('language.zhHant')}</option>
            <option value="en">{t('language.en')}</option>
          </select>
        </label>
        <a
          className="docs-link"
          href="https://github.com/discord/discord-api-docs/blob/anthony%2Fembed-unfurl-components/developers%2Flink-previews%2Fcomponent-embeds.mdx"
          target="_blank"
          rel="noreferrer"
        >
          {t('app.docs')} <ArrowUpRight size={14} />
        </a>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> DISCORD COMPONENTS V2
            </div>
            <h1>{managerId ? t('hero.manageTitle') : t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </div>
          <div className="heading-status">
            <ShieldCheck size={15} />
            {t('hero.status')}
          </div>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {managerId && !managerToken && (
          <div className="notice error">{t('management.missingToken')}</div>
        )}
        {deleted && (
          <div className="notice">
            {t('management.deleted')}
            <a href={addLocaleParam('/', locale)}>{t('management.createNew')}</a>
          </div>
        )}
        {managerId && !deleted && (
          <div className="notice management">
            <Link2 size={16} />
            <span>
              {t('management.prefix')}{' '}
              <a href={`/s/${managerId}`} target="_blank" rel="noreferrer">
                /s/{managerId} ↗
              </a>
              {t('management.suffix')}
            </span>
          </div>
        )}
        <nav className="mobile-tabs" aria-label={t('workspace.label')}>
          <button
            className={mobileTab === 'edit' ? 'active' : ''}
            onClick={() => setMobileTab('edit')}
          >
            <Layers size={16} />
            {t('workspace.edit')}
          </button>
          <button
            className={mobileTab === 'preview' ? 'active' : ''}
            onClick={() => setMobileTab('preview')}
          >
            <Eye size={16} />
            {t('workspace.preview')}
          </button>
        </nav>
        <div className={`work-grid mobile-${mobileTab}`}>
          <section className="editor-panel">
            <div className="panel-bar">
              <div className="editor-tabs" role="tablist" aria-label={t('editor.modeLabel')}>
                <button
                  role="tab"
                  aria-selected={mode === 'visual'}
                  className={mode === 'visual' ? 'active' : ''}
                  onClick={() => setMode('visual')}
                >
                  <Layers size={15} />
                  {t('editor.visual')}
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
                {managerId
                  ? t('editor.managerMode')
                  : storageFailed
                    ? t('editor.storageFailed')
                    : t('editor.draftSaved')}
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
                        {t('editor.previewInfo')}
                        <small>{t('editor.previewInfoHint')}</small>
                      </span>
                    </div>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="settings-fields">
                    <Field label={t('editor.previewTitle')}>
                      <input
                        value={design.title}
                        maxLength={200}
                        onChange={(e) => update({ ...design, title: e.target.value })}
                      />
                    </Field>
                    <Field label={t('editor.previewDescription')}>
                      <textarea
                        rows={2}
                        value={design.description}
                        maxLength={500}
                        onChange={(e) => update({ ...design, description: e.target.value })}
                      />
                    </Field>
                    <Field label={t('editor.coverUrl')} hint={t('editor.mediaPrefixHint')}>
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
                        <span className="step-number">01</span>
                        {t('editor.containerStyle')}
                      </div>
                      <div className="container-controls">
                        <label className="color-control">
                          <input
                            aria-label={t('editor.containerColor')}
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
                          <span>{t('editor.accentColor')}</span>
                          <code>
                            {design.component.accent_color == null
                              ? t('editor.none')
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
                          {t('editor.clear')}
                        </button>
                        <Check
                          label={t('editor.hideContent')}
                          checked={design.component.spoiler}
                          onChange={(spoiler) =>
                            update({ ...design, component: { ...design.component, spoiler } })
                          }
                        />
                      </div>
                    </div>
                    <div className="component-heading">
                      <div className="section-label">
                        <span className="step-number">02</span>
                        {t('editor.compose')}
                      </div>
                      <span>{t('editor.componentCount', { count: componentCount })}</span>
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
                                title={t('component.dragTitle')}
                                aria-label={t('component.dragLabel', { index: index + 1 })}
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
                                <span>{childName(child.type, locale)}</span>
                                <span className="component-index">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                              </button>
                              <div className="component-actions">
                                <button
                                  className="icon-button"
                                  aria-label={t('component.moveUpLabel', { index: index + 1 })}
                                  title={t('component.moveUp')}
                                  disabled={index === 0}
                                  onClick={() => move(index, -1)}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={t('component.moveDownLabel', { index: index + 1 })}
                                  title={t('component.moveDown')}
                                  disabled={index === design.component.components.length - 1}
                                  onClick={() => move(index, 1)}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={t('component.copyLabel', { index: index + 1 })}
                                  title={t('component.copy')}
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
                                  aria-label={t('component.deleteLabel', { index: index + 1 })}
                                  title={t('component.delete')}
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
                        {t('component.add')}
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
                              <span>{childName(type, locale)}</span>
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
                          {t('json.import')}
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
                          {t('json.export')}
                        </button>
                      </div>
                    </div>
                    <textarea
                      aria-label="Component JSON"
                      value={raw}
                      onChange={(e) => updateRaw(e.target.value)}
                      spellCheck={false}
                    />
                    <p className="field-hint">{t('json.hint')}</p>
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
                  <strong>{t('validation.summary')}</strong>
                  <ul>
                    {validation.slice(0, 8).map((issue, i) => (
                      <li key={i}>
                        <code>{issue.path}</code> {issue.message}
                      </li>
                    ))}
                  </ul>
                  {validation.length > 8 && (
                    <span>{t('validation.more', { count: validation.length - 8 })}</span>
                  )}
                </div>
              )}
            </div>
            <div className="editor-footer">
              <span>
                <ShieldCheck size={14} />
                {managerId ? t('editor.managerVerified') : t('editor.managerKeyAfterPublish')}
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
                {t('json.importFile')}
              </button>
            </div>
          </section>
          <aside className="preview-panel">
            <div className="preview-bar">
              <span>
                <Eye size={16} />
                {t('workspace.preview')}
              </span>
              <span className="live-pill">
                <i />
                LIVE
              </span>
            </div>
            <div className="preview-surface">
              <div className="channel-label">
                <span>#</span> {t('preview.channel')}{' '}
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
                    {t('preview.author')}
                    <span>{t('preview.today')}</span>
                  </div>
                  <div className="sample-link">https://forma.link/s/your-idea</div>
                  <Preview component={design.component} />
                </div>
              </div>
              <div className="preview-note">
                <span />
                <span>{t('preview.note')}</span>
              </div>
            </div>
            <div className="publish-card">
              <div className="publish-icon">
                <Link2 size={23} />
              </div>
              <h2>{t('publish.ready')}</h2>
              <p>
                {t('publish.description1')}
                <br />
                {t('publish.description2')}
              </p>
              <button className="publish-button" disabled={disabled} onClick={publish}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                {loading
                  ? t('publish.loading')
                  : managerId
                    ? t('publish.save')
                    : t('publish.create')}
                <ArrowUpRight size={18} />
              </button>
              <div className="publish-meta">
                <CheckIcon size={12} />
                {t('publish.publicPage')}
                <span>·</span>
                <CheckIcon size={12} />
                {t('publish.managementCredential')}
              </div>
              {managerId && !deleted && (
                <button
                  className="delete-link"
                  disabled={busy || loading || loadFailed || !managerToken}
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={13} />
                  {t('publish.delete')}
                </button>
              )}
            </div>
            <div className="tip">
              <span>✦</span>
              <p>
                <strong>{t('tip.title')}</strong>
                {t('tip.body')}
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
          aria-label={t('dialog.closeResult')}
          onClick={() => setResult(null)}
        >
          <X size={18} />
        </button>
        <div className="success-icon">
          <CheckIcon size={25} />
        </div>
        <div className="eyebrow">READY TO SHARE</div>
        <h2>{managerId ? t('dialog.updated') : t('dialog.created')}</h2>
        <p>{t('dialog.shareHint')}</p>
        {result && (
          <>
            <Field label={t('dialog.publicLink')}>
              <div className="copy-field">
                <input readOnly value={result.url} onFocus={(e) => e.target.select()} />
                <button aria-label={t('dialog.copyPublic')} onClick={() => copy(result.url)}>
                  <Copy size={17} />
                </button>
              </div>
            </Field>
            <a className="open-result" href={result.url} target="_blank" rel="noreferrer">
              {t('dialog.openPage')} <ExternalLink size={14} />
            </a>
            <div className="management-secret">
              <ShieldCheck size={19} />
              <div>
                <strong>{t('dialog.managerTitle')}</strong>
                <p>{t('dialog.managerBody')}</p>
              </div>
            </div>
            <div className="copy-field">
              <input
                aria-label={t('dialog.privateLink')}
                readOnly
                value={result.manageUrl || ''}
                onFocus={(e) => e.target.select()}
              />
              <button
                aria-label={t('dialog.copyPrivate')}
                onClick={() => copy(result.manageUrl || '')}
              >
                <Copy size={17} />
              </button>
            </div>
            <button
              className="publish-button"
              onClick={() =>
                download(
                  t('download.managerTitle') +
                    '\n' +
                    result.manageUrl +
                    '\n\n' +
                    t('download.publicTitle') +
                    '\n' +
                    result.url +
                    '\n',
                  'forma-management.txt',
                  'text/plain',
                )
              }
            >
              <Download size={16} />
              {t('dialog.savePrivate')}
            </button>
            <p className="dialog-footnote">{t('dialog.cacheNote')}</p>
          </>
        )}
      </dialog>
      <dialog ref={deleteRef} className="result-dialog" onCancel={() => setDeleteConfirm(false)}>
        <h2>{t('dialog.deleteTitle')}</h2>
        <p>{t('dialog.deleteBody')}</p>
        <div className="dialog-actions">
          <button onClick={() => setDeleteConfirm(false)} disabled={busy}>
            {t('dialog.keep')}
          </button>
          <button className="danger-button" onClick={remove} disabled={busy}>
            {busy ? t('dialog.deleting') : t('dialog.confirmDelete')}
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
