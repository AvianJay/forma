import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { normalizeMediaUrl, type Button, type Child, type Thumbnail } from '../shared/design';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const labelId = useId();
  const control =
    isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'textarea', 'select'].includes(children.type)
      ? cloneElement(
          children as ReactElement<{ 'aria-labelledby'?: string; 'aria-describedby'?: string }>,
          { 'aria-labelledby': labelId, 'aria-describedby': hint ? `${labelId}-hint` : undefined },
        )
      : children;
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {control}
      {hint && <small id={`${labelId}-hint`}>{hint}</small>}
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
function UrlField({
  value,
  onChange,
  label = '媒體網址',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Field label={label} hint="Discord CDN 網址會自動加上指定的媒體前綴。">
      <input
        type="url"
        value={value}
        placeholder="https://…"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeMediaUrl(e.target.value))}
      />
    </Field>
  );
}
function ButtonFields({
  button,
  onChange,
}: {
  button: Button;
  onChange: (button: Button) => void;
}) {
  return (
    <div className="field-stack">
      <Field label="按鈕文字">
        <input
          value={button.label || ''}
          placeholder="開啟連結"
          maxLength={80}
          onChange={(e) => onChange({ ...button, label: e.target.value || undefined })}
        />
      </Field>
      <Field label="目的網址">
        <input
          type="url"
          value={button.url}
          placeholder="https://…"
          onChange={(e) => onChange({ ...button, url: e.target.value })}
        />
      </Field>
      <details className="sub-options">
        <summary>Emoji 與按鈕選項</summary>
        <div className="field-stack">
          <Field label="Emoji">
            <input
              value={button.emoji?.name || ''}
              placeholder="例如：✨"
              onChange={(e) =>
                onChange({
                  ...button,
                  emoji:
                    e.target.value || button.emoji?.id
                      ? { ...button.emoji, name: e.target.value || undefined }
                      : undefined,
                })
              }
            />
          </Field>
          <Field label="自訂 Emoji ID">
            <input
              inputMode="numeric"
              value={button.emoji?.id || ''}
              placeholder="選填 Discord emoji ID"
              onChange={(e) =>
                onChange({
                  ...button,
                  emoji:
                    e.target.value || button.emoji?.name
                      ? { ...button.emoji, id: e.target.value || undefined }
                      : undefined,
                })
              }
            />
          </Field>
          {button.emoji?.id && (
            <Check
              label="動態 Emoji"
              checked={button.emoji.animated}
              onChange={(animated) => onChange({ ...button, emoji: { ...button.emoji, animated } })}
            />
          )}
          <Check
            label="停用按鈕"
            checked={button.disabled}
            onChange={(disabled) => onChange({ ...button, disabled })}
          />
        </div>
      </details>
    </div>
  );
}
function ThumbnailFields({
  thumbnail,
  onChange,
}: {
  thumbnail: Thumbnail;
  onChange: (value: Thumbnail) => void;
}) {
  return (
    <div className="field-stack">
      <UrlField
        label="縮圖網址"
        value={thumbnail.media.url}
        onChange={(url) => onChange({ ...thumbnail, media: { url } })}
      />
      <Field label="圖片替代文字">
        <input
          value={thumbnail.description || ''}
          maxLength={1024}
          onChange={(e) => onChange({ ...thumbnail, description: e.target.value })}
        />
      </Field>
      <Check
        label="隱藏縮圖（Spoiler）"
        checked={thumbnail.spoiler}
        onChange={(spoiler) => onChange({ ...thumbnail, spoiler })}
      />
    </div>
  );
}

export function ComponentFields({
  component,
  onChange,
}: {
  component: Child;
  onChange: (component: Child) => void;
}) {
  switch (component.type) {
    case 10:
      return (
        <Field label="文字內容" hint="支援 Markdown：標題、粗體、清單、連結與 ||隱藏文字||。">
          <textarea
            className="content-input"
            value={component.content}
            maxLength={4000}
            onChange={(e) => onChange({ ...component, content: e.target.value })}
            rows={5}
          />
        </Field>
      );
    case 14:
      return (
        <div className="field-stack">
          <Check
            label="顯示分隔線"
            checked={component.divider !== false}
            onChange={(divider) => onChange({ ...component, divider })}
          />
          <Field label="上下間距">
            <select
              value={component.spacing || 1}
              onChange={(e) => onChange({ ...component, spacing: Number(e.target.value) as 1 | 2 })}
            >
              <option value={1}>小間距</option>
              <option value={2}>大間距</option>
            </select>
          </Field>
        </div>
      );
    case 1:
      return (
        <div className="field-stack">
          {component.components.map((button, i) => (
            <fieldset className="nested" key={i}>
              <legend>按鈕 {i + 1}</legend>
              <button
                className="remove-nested icon-button"
                aria-label={`刪除按鈕 ${i + 1}`}
                disabled={component.components.length === 1}
                onClick={() =>
                  onChange({
                    ...component,
                    components: component.components.filter((_, n) => n !== i),
                  })
                }
              >
                <X size={14} />
              </button>
              <ButtonFields
                button={button}
                onChange={(value) =>
                  onChange({
                    ...component,
                    components: component.components.map((b, n) => (n === i ? value : b)),
                  })
                }
              />
            </fieldset>
          ))}
          <button
            className="add-small"
            disabled={component.components.length >= 5}
            onClick={() =>
              onChange({
                ...component,
                components: [
                  ...component.components,
                  { type: 2, style: 5, label: '開啟連結', url: 'https://example.com' },
                ],
              })
            }
          >
            <Plus size={14} />
            新增按鈕 <span>{component.components.length}/5</span>
          </button>
        </div>
      );
    case 9:
      return (
        <div className="field-stack">
          {component.components.map((text, i) => (
            <div className="nested text-nested" key={i}>
              <Field label={`區塊文字 ${i + 1}`}>
                <textarea
                  rows={3}
                  value={text.content}
                  onChange={(e) =>
                    onChange({
                      ...component,
                      components: component.components.map((t, n) =>
                        n === i ? { ...t, content: e.target.value } : t,
                      ),
                    })
                  }
                />
              </Field>
              {component.components.length > 1 && (
                <button
                  className="text-action"
                  onClick={() =>
                    onChange({
                      ...component,
                      components: component.components.filter((_, n) => n !== i),
                    })
                  }
                >
                  移除此段
                </button>
              )}
            </div>
          ))}
          <button
            className="add-small"
            disabled={component.components.length >= 3}
            onClick={() =>
              onChange({
                ...component,
                components: [...component.components, { type: 10, content: '新的文字段落' }],
              })
            }
          >
            <Plus size={14} />
            新增段落 <span>{component.components.length}/3</span>
          </button>
          <Field label="旁側配件">
            <select
              value={component.accessory.type}
              onChange={(e) =>
                onChange({
                  ...component,
                  accessory:
                    e.target.value === '11'
                      ? { type: 11, media: { url: '' } }
                      : { type: 2, style: 5, label: '了解更多', url: 'https://example.com' },
                })
              }
            >
              <option value={11}>縮圖</option>
              <option value={2}>連結按鈕</option>
            </select>
          </Field>
          {component.accessory.type === 11 ? (
            <ThumbnailFields
              thumbnail={component.accessory}
              onChange={(accessory) => onChange({ ...component, accessory })}
            />
          ) : (
            <ButtonFields
              button={component.accessory}
              onChange={(accessory) => onChange({ ...component, accessory })}
            />
          )}
        </div>
      );
    case 12:
      return (
        <div className="field-stack">
          {component.items.map((item, i) => (
            <fieldset className="nested" key={i}>
              <legend>媒體 {i + 1}</legend>
              <button
                className="remove-nested icon-button"
                aria-label={`刪除媒體 ${i + 1}`}
                disabled={component.items.length === 1}
                onClick={() =>
                  onChange({ ...component, items: component.items.filter((_, n) => n !== i) })
                }
              >
                <X size={14} />
              </button>
              <div className="field-stack">
                <UrlField
                  value={item.media.url}
                  onChange={(url) =>
                    onChange({
                      ...component,
                      items: component.items.map((v, n) =>
                        n === i ? { ...v, media: { url } } : v,
                      ),
                    })
                  }
                />
                <Field label="媒體替代文字">
                  <input
                    value={item.description || ''}
                    maxLength={1024}
                    onChange={(e) =>
                      onChange({
                        ...component,
                        items: component.items.map((v, n) =>
                          n === i ? { ...v, description: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </Field>
                <Check
                  label="隱藏媒體（Spoiler）"
                  checked={item.spoiler}
                  onChange={(spoiler) =>
                    onChange({
                      ...component,
                      items: component.items.map((v, n) => (n === i ? { ...v, spoiler } : v)),
                    })
                  }
                />
              </div>
            </fieldset>
          ))}
          <button
            className="add-small"
            disabled={component.items.length >= 10}
            onClick={() =>
              onChange({ ...component, items: [...component.items, { media: { url: '' } }] })
            }
          >
            <Plus size={14} />
            新增圖片或影片 <span>{component.items.length}/10</span>
          </button>
          <p className="field-hint">
            圖片：PNG、GIF、JPEG、WebP、AVIF。影片：MP4、MOV、WebM。網址需公開可讀。
          </p>
        </div>
      );
  }
}
