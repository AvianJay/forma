import { useState, type CSSProperties, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isHttpUrl, normalizeMediaUrl, type Button, type Child, type Container } from './design';

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: Record<string, unknown> };
function remarkSpoilers() {
  return (tree: MdNode) => {
    const visit = (node: MdNode) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== 'text' || !child.value?.includes('||')) {
          visit(child);
          return [child];
        }
        return child.value
          .split(/(\|\|[^|]+\|\|)/g)
          .filter(Boolean)
          .map((value) =>
            value.startsWith('||') && value.endsWith('||')
              ? {
                  type: 'spoiler',
                  data: {
                    hName: 'span',
                    hProperties: {
                      className: 'text-spoiler',
                      tabIndex: 0,
                      title: '點擊或聚焦以顯示',
                    },
                  },
                  children: [{ type: 'text', value: value.slice(2, -2) }],
                }
              : { type: 'text', value },
          );
      });
    };
    visit(tree);
  };
}

function Spoiler({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  return hidden ? (
    <details className="spoiler">
      <summary>點擊顯示隱藏內容</summary>
      {children}
    </details>
  ) : (
    children
  );
}

function Media({
  url,
  description,
  thumbnail = false,
}: {
  url: string;
  description?: string | null;
  thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const normalized = normalizeMediaUrl(url);
  const video = !thumbnail && /\.(mp4|mov|webm)(?:[?#]|$)/i.test(normalized);
  if (!isHttpUrl(normalized))
    return <div className="media-placeholder">{thumbnail ? '縮圖' : '加入媒體網址'}</div>;
  if (failed)
    return (
      <div className="media-placeholder">
        媒體無法載入
        <a href={normalized} target="_blank" rel="noreferrer">
          開啟原始網址 ↗
        </a>
      </div>
    );
  return video ? (
    <video
      src={normalized}
      controls
      playsInline
      preload="metadata"
      aria-label={description || '影片'}
      onError={() => setFailed(true)}
    />
  ) : (
    <img
      src={normalized}
      alt={description || (thumbnail ? '縮圖' : '相簿圖片')}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function LinkButton({ button }: { button: Button }) {
  return (
    <a
      className={`discord-button ${button.disabled ? 'disabled' : ''}`}
      href={!button.disabled && isHttpUrl(button.url) ? button.url : undefined}
      aria-disabled={button.disabled}
      target="_blank"
      rel="noreferrer"
    >
      {button.emoji?.id ? (
        <img
          className="emoji"
          alt={button.emoji.name || 'emoji'}
          src={normalizeMediaUrl(
            `https://cdn.discordapp.com/emojis/${button.emoji.id}.${button.emoji.animated ? 'gif' : 'png'}`,
          )}
        />
      ) : (
        button.emoji?.name
      )}
      {button.label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function TextContent({ content }: { content: string }) {
  return (
    <div className="discord-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkSpoilers]}
        skipHtml
        urlTransform={(value) => (isHttpUrl(value) ? value : '')}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
          img: ({ alt }) => <span>{alt}</span>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

function ComponentView({ component }: { component: Child }) {
  switch (component.type) {
    case 10:
      return <TextContent content={component.content} />;
    case 14:
      return (
        <div
          className={`discord-separator ${component.divider !== false ? 'with-line' : ''} ${component.spacing === 2 ? 'large' : ''}`}
        />
      );
    case 1:
      return (
        <div className="discord-actions">
          {component.components.map((button, i) => (
            <LinkButton key={i} button={button} />
          ))}
        </div>
      );
    case 9:
      return (
        <div className="discord-section">
          <div>
            {component.components.map((text, i) => (
              <TextContent key={i} content={text.content} />
            ))}
          </div>
          {component.accessory.type === 2 ? (
            <LinkButton button={component.accessory} />
          ) : (
            <div className="discord-thumbnail">
              <Spoiler hidden={component.accessory.spoiler}>
                <Media
                  key={component.accessory.media.url}
                  thumbnail
                  url={component.accessory.media.url}
                  description={component.accessory.description}
                />
              </Spoiler>
            </div>
          )}
        </div>
      );
    case 12:
      return (
        <div className={`discord-gallery items-${component.items.length}`}>
          {component.items.map((item, i) => (
            <div className="gallery-item" key={i}>
              <Spoiler hidden={item.spoiler}>
                <Media key={item.media.url} url={item.media.url} description={item.description} />
              </Spoiler>
            </div>
          ))}
        </div>
      );
  }
}

export function Preview({ component }: { component: Container }) {
  return (
    <div
      className="discord-card"
      style={
        {
          '--accent':
            component.accent_color == null
              ? 'transparent'
              : `#${component.accent_color.toString(16).padStart(6, '0')}`,
        } as CSSProperties
      }
    >
      <Spoiler hidden={component.spoiler}>
        {component.components.map((child, i) => (
          <ComponentView key={i} component={child} />
        ))}
      </Spoiler>
    </div>
  );
}
