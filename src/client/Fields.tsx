import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { normalizeMediaUrl, type Button, type Child, type Thumbnail } from '../shared/design';
import { useI18n } from '../shared/I18nContext';

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
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <Field label={label || t('field.mediaUrl')} hint={t('field.mediaPrefixHint')}>
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
  const { t } = useI18n();
  return (
    <div className="field-stack">
      <Field label={t('field.buttonText')}>
        <input
          value={button.label || ''}
          placeholder={t('field.openLink')}
          maxLength={80}
          onChange={(e) => onChange({ ...button, label: e.target.value || undefined })}
        />
      </Field>
      <Field label={t('field.destinationUrl')}>
        <input
          type="url"
          value={button.url}
          placeholder="https://…"
          onChange={(e) => onChange({ ...button, url: e.target.value })}
        />
      </Field>
      <details className="sub-options">
        <summary>{t('field.emojiOptions')}</summary>
        <div className="field-stack">
          <Field label="Emoji">
            <input
              value={button.emoji?.name || ''}
              placeholder={t('field.emojiExample')}
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
          <Field label={t('field.customEmojiId')}>
            <input
              inputMode="numeric"
              value={button.emoji?.id || ''}
              placeholder={t('field.customEmojiPlaceholder')}
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
              label={t('field.animatedEmoji')}
              checked={button.emoji.animated}
              onChange={(animated) => onChange({ ...button, emoji: { ...button.emoji, animated } })}
            />
          )}
          <Check
            label={t('field.disableButton')}
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
  const { t } = useI18n();
  return (
    <div className="field-stack">
      <UrlField
        label={t('field.thumbnailUrl')}
        value={thumbnail.media.url}
        onChange={(url) => onChange({ ...thumbnail, media: { url } })}
      />
      <Field label={t('field.imageAlt')}>
        <input
          value={thumbnail.description || ''}
          maxLength={1024}
          onChange={(e) => onChange({ ...thumbnail, description: e.target.value })}
        />
      </Field>
      <Check
        label={t('field.thumbnailSpoiler')}
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
  const { t } = useI18n();
  switch (component.type) {
    case 10:
      return (
        <Field label={t('field.textContent')} hint={t('field.markdownHint')}>
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
            label={t('field.showDivider')}
            checked={component.divider !== false}
            onChange={(divider) => onChange({ ...component, divider })}
          />
          <Field label={t('field.spacing')}>
            <select
              value={component.spacing || 1}
              onChange={(e) => onChange({ ...component, spacing: Number(e.target.value) as 1 | 2 })}
            >
              <option value={1}>{t('field.spacingSmall')}</option>
              <option value={2}>{t('field.spacingLarge')}</option>
            </select>
          </Field>
        </div>
      );
    case 1:
      return (
        <div className="field-stack">
          {component.components.map((button, i) => (
            <fieldset className="nested" key={i}>
              <legend>{t('field.buttonLegend', { index: i + 1 })}</legend>
              <button
                className="remove-nested icon-button"
                aria-label={t('field.deleteButton', { index: i + 1 })}
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
                  { type: 2, style: 5, label: t('field.openLink'), url: 'https://example.com' },
                ],
              })
            }
          >
            <Plus size={14} />
            {t('field.addButton')} <span>{component.components.length}/5</span>
          </button>
        </div>
      );
    case 9:
      return (
        <div className="field-stack">
          {component.components.map((text, i) => (
            <div className="nested text-nested" key={i}>
              <Field label={t('field.sectionText', { index: i + 1 })}>
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
                  {t('field.removeParagraph')}
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
                components: [
                  ...component.components,
                  { type: 10, content: t('starter.paragraph') },
                ],
              })
            }
          >
            <Plus size={14} />
            {t('field.addParagraph')} <span>{component.components.length}/3</span>
          </button>
          <Field label={t('field.accessory')}>
            <select
              value={component.accessory.type}
              onChange={(e) =>
                onChange({
                  ...component,
                  accessory:
                    e.target.value === '11'
                      ? { type: 11, media: { url: '' } }
                      : {
                          type: 2,
                          style: 5,
                          label: t('starter.learnMore'),
                          url: 'https://example.com',
                        },
                })
              }
            >
              <option value={11}>{t('field.thumbnail')}</option>
              <option value={2}>{t('field.linkButton')}</option>
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
              <legend>{t('field.mediaLegend', { index: i + 1 })}</legend>
              <button
                className="remove-nested icon-button"
                aria-label={t('field.deleteMedia', { index: i + 1 })}
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
                <Field label={t('field.mediaAlt')}>
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
                  label={t('field.mediaSpoiler')}
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
            {t('field.addMedia')} <span>{component.items.length}/10</span>
          </button>
          <p className="field-hint">{t('field.mediaFormats')}</p>
        </div>
      );
  }
}
