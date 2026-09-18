import type { Design } from './design';

export function homepageDesign(origin: string): Design {
  return {
    schemaVersion: 1,
    title: 'Forma — Discord Components V2 卡片產生器',
    description:
      '自由組合文字、媒體與按鈕，在 Discord 呈現精美卡片。免註冊帳號，即開即用。',
    component: {
      type: 17,
      accent_color: 0xbef264,
      components: [
        {
          type: 10,
          content: '## Forma · 你的內容，值得更好的登場。\n自由編排豐富元件，在 Discord 完美呈現。',
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content:
            '✦ **自由組合** — 支援文字、圖片、影片與互動按鈕\n✦ **即時預覽** — 視覺編輯與 JSON 雙向同步\n✦ **即開即用** — 永久有效，附專屬管理金鑰',
        },
        {
          type: 1,
          components: [
            { type: 2, style: 5, label: '開始設計', url: `${origin}/` },
            { type: 2, style: 5, label: 'GitHub', url: 'https://github.com/AvianJay/forma' },
          ],
        },
      ],
    },
  };
}
