import type { Design } from './design';

export function homepageDesign(origin: string): Design {
  return {
    schemaVersion: 1,
    title: 'Forma — Discord Components V2 連結設計器',
    description:
      '自由設計文字、圖片、影片與按鈕，生成能在 Discord 展開的短連結。免登入，立即開始創作。',
    component: {
      type: 17,
      accent_color: 0xbef264,
      components: [
        {
          type: 10,
          content: '## Forma · 你的內容，值得更好的登場。\n把你的設計，變成一個 Discord 短連結。',
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content:
            '✦ **自由組合** — 文字、圖片、影片與連結按鈕\n✦ **即時預覽** — 視覺編輯與 JSON 自由切換\n✦ **免登入分享** — 永久短連結，搭配私人管理連結',
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
