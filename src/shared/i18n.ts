export const supportedLocales = ['zh-Hant', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];
export const DEFAULT_LOCALE: Locale = 'zh-Hant';
export const LOCALE_COOKIE = 'forma_locale';

const zhHant = {
  'meta.title': 'Forma — Discord 連結設計器',
  'meta.description': '設計你的 Discord Components V2 預覽，一個短連結就能分享。',
  'language.label': '語言',
  'language.zhHant': '繁中',
  'language.en': 'English',
  'app.topbarTitle': 'Discord 卡片設計器',
  'app.docs': '開發文件',
  'hero.title': '你的內容，值得更好的登場。',
  'hero.manageTitle': '管理卡片內容',
  'hero.description': '自由組合文字、媒體與按鈕，即時打造專屬卡片。',
  'hero.status': '無需註冊 · 即開即用',
  'management.missingToken': '缺少管理密鑰。請使用包含 #token 的完整私人管理連結。',
  'management.deleted': '內容已刪除。',
  'management.createNew': '建立新卡片 ↗',
  'management.prefix': '正在管理',
  'management.suffix': '。儲存即更新公開內容；Discord 預覽快取可能稍有延遲。',
  'workspace.label': '工作區',
  'workspace.edit': '編輯設計',
  'workspace.preview': '即時預覽',
  'editor.modeLabel': '編輯模式',
  'editor.visual': '視覺編輯',
  'editor.managerMode': '私人管理模式',
  'editor.storageFailed': '草稿儲存失敗',
  'editor.draftSaved': '草稿已自動儲存',
  'editor.previewInfo': '預覽資訊',
  'editor.previewInfoHint': '標題、說明與封面圖片',
  'editor.previewTitle': '預覽標題',
  'editor.previewDescription': '預覽描述',
  'editor.coverUrl': '封面網址（選填）',
  'editor.mediaPrefixHint': 'cdn.discordapp.com 的 attachments 網址會自動套用媒體前綴。',
  'editor.containerStyle': '容器樣式',
  'editor.containerColor': '容器色彩',
  'editor.accentColor': '強調色',
  'editor.none': '無',
  'editor.clear': '清除',
  'editor.hideContent': '隱藏內容',
  'editor.compose': '組合你的內容',
  'editor.componentCount': '{count} / 40 元件',
  'component.text': '文字',
  'component.section': '圖文區塊',
  'component.gallery': '媒體相簿',
  'component.separator': '分隔線',
  'component.row': '按鈕列',
  'component.dragTitle': '拖曳以排序',
  'component.dragLabel': '拖曳排序元件 {index}',
  'component.moveUp': '上移',
  'component.moveUpLabel': '上移元件 {index}',
  'component.moveDown': '下移',
  'component.moveDownLabel': '下移元件 {index}',
  'component.copy': '複製',
  'component.copyLabel': '複製元件 {index}',
  'component.delete': '刪除',
  'component.deleteLabel': '刪除元件 {index}',
  'component.add': '新增元件',
  'json.import': '匯入',
  'json.export': '匯出',
  'json.hint': '直接貼上 { component: … }。驗證通過後會同步至視覺編輯器；未完成的 JSON 會保留。',
  'json.invalid': 'JSON 格式有誤，請檢查括號、逗號與引號。',
  'validation.summary': '發布前，還有幾個地方需要調整',
  'validation.more': '另有 {count} 個錯誤',
  'validation.bodyTooLarge': '設計內容超過 64 KiB。',
  'validation.importTooLarge': '匯入檔案不可超過 64 KiB',
  'editor.managerVerified': '已驗證管理權限',
  'editor.managerKeyAfterPublish': '發布後取得專屬管理密鑰',
  'json.importFile': '匯入 JSON',
  'preview.channel': '預覽頻道',
  'preview.author': '你的名字',
  'preview.today': '今天 12:00',
  'preview.note': 'Discord 預覽模擬，實際顯示以 Discord 為準。',
  'publish.ready': '準備發布',
  'publish.description1': '生成專屬網址，貼入 Discord 即可呈現卡片。',
  'publish.description2': '永久有效，無需註冊帳號。',
  'publish.loading': '載入設計中…',
  'publish.save': '儲存變更',
  'publish.create': '生成短連結',
  'publish.publicPage': '公開展示頁',
  'publish.managementCredential': '附管理憑證',
  'publish.delete': '刪除此連結',
  'embed.copy': '複製網站嵌入碼',
  'embed.hint':
    '不需生成短連結。將嵌入碼貼到自己網站 HTML 的 <head>，再把該頁網址分享到 Discord。嵌入碼需包含在伺服器回傳的 HTML 中。',
  'embed.viewCode': '查看嵌入碼',
  'embed.code': '網站嵌入碼',
  'embed.invalid': '請先完成元件內容並修正 JSON 錯誤。',
  'embed.copyFailed': '無法使用剪貼簿，已選取嵌入碼，請手動複製。',
  'tip.title': '設計小技巧',
  'tip.body': '加入醒目標題、配圖或按鈕，讓卡片更具吸引力。',
  'dialog.closeResult': '關閉發布結果',
  'dialog.updated': '已更新卡片內容',
  'dialog.created': '卡片已成功建立',
  'dialog.shareHint': '將網址貼到 Discord 頻道，即可自動展開卡片。',
  'dialog.publicLink': '公開短連結',
  'dialog.copyPublic': '複製短連結',
  'dialog.openPage': '開啟展示頁',
  'dialog.managerTitle': '保存你的私人管理連結',
  'dialog.managerBody': '這是修改與刪除內容的唯一憑證。請妥善保存，勿公開分享；遺失後無法復原。',
  'dialog.privateLink': '私人管理連結',
  'dialog.copyPrivate': '複製管理連結',
  'dialog.savePrivate': '保存管理連結',
  'dialog.cacheNote': '修改後，Discord 已有的預覽可能需要一段時間才會更新。',
  'dialog.deleteTitle': '刪除這個短連結？',
  'dialog.deleteBody': '公開展示頁將無法存取，這個動作無法復原。',
  'dialog.keep': '保留連結',
  'dialog.deleting': '刪除中…',
  'dialog.confirmDelete': '確認刪除',
  'download.managerTitle': 'Forma 私人管理連結（請勿公開）',
  'download.publicTitle': '公開短連結',
  'toast.copied': '已複製到剪貼簿',
  'toast.copyFailed': '無法使用剪貼簿，請選取網址手動複製。',
  'toast.deleted': '短連結已刪除',
  'toast.jsonLoaded': '已載入 JSON，請確認驗證結果',
  'error.loadLink': '無法載入連結',
  'error.serverNoLink': '伺服器未回傳連結，請稍後再試',
  'error.publish': '發布失敗，請稍後再試',
  'error.delete': '刪除失敗',
  'field.mediaUrl': '媒體網址',
  'field.mediaPrefixHint': 'cdn.discordapp.com 的 attachments 網址會自動加上指定的媒體前綴。',
  'field.buttonText': '按鈕文字',
  'field.openLink': '開啟連結',
  'field.destinationUrl': '目的網址',
  'field.emojiOptions': 'Emoji 與按鈕選項',
  'field.emojiExample': '例如：✨',
  'field.customEmojiId': '自訂 Emoji ID',
  'field.customEmojiPlaceholder': '選填 Discord emoji ID',
  'field.animatedEmoji': '動態 Emoji',
  'field.disableButton': '停用按鈕',
  'field.thumbnailUrl': '縮圖網址',
  'field.imageAlt': '圖片替代文字',
  'field.thumbnailSpoiler': '隱藏縮圖（Spoiler）',
  'field.textContent': '文字內容',
  'field.markdownHint': '支援 Markdown：標題、粗體、清單、連結與 ||隱藏文字||。',
  'field.showDivider': '顯示分隔線',
  'field.spacing': '上下間距',
  'field.spacingSmall': '小間距',
  'field.spacingLarge': '大間距',
  'field.buttonLegend': '按鈕 {index}',
  'field.deleteButton': '刪除按鈕 {index}',
  'field.addButton': '新增按鈕',
  'field.sectionText': '區塊文字 {index}',
  'field.removeParagraph': '移除此段',
  'field.addParagraph': '新增段落',
  'field.accessory': '旁側配件',
  'field.thumbnail': '縮圖',
  'field.linkButton': '連結按鈕',
  'field.mediaLegend': '媒體 {index}',
  'field.deleteMedia': '刪除媒體 {index}',
  'field.mediaAlt': '媒體替代文字',
  'field.mediaSpoiler': '隱藏媒體（Spoiler）',
  'field.addMedia': '新增圖片或影片',
  'field.mediaFormats': '圖片：PNG、GIF、JPEG、WebP、AVIF。影片：MP4、MOV、WebM。網址需公開可讀。',
  'preview.revealTitle': '點擊或聚焦以顯示',
  'preview.reveal': '點擊顯示隱藏內容',
  'preview.thumbnail': '縮圖',
  'preview.addMediaUrl': '加入媒體網址',
  'preview.mediaFailed': '媒體無法載入',
  'preview.openOriginal': '開啟原始網址 ↗',
  'preview.video': '影片',
  'preview.galleryImage': '相簿圖片',
  'homepage.title': 'Forma — Discord Components V2 卡片產生器',
  'homepage.description':
    '自由組合文字、媒體與按鈕，在 Discord 呈現精美卡片。免註冊帳號，即開即用。',
  'homepage.hero': '## Forma · 你的內容，值得更好的登場。\n自由編排豐富元件，在 Discord 完美呈現。',
  'homepage.features':
    '✦ **自由組合** — 支援文字、圖片、影片與互動按鈕\n✦ **即時預覽** — 視覺編輯與 JSON 雙向同步\n✦ **即開即用** — 永久有效，附專屬管理金鑰',
  'homepage.start': '開始設計',
  'public.preview': '卡片預覽',
  'public.userNotice': '此頁面內容由使用者建立。',
  'public.madeWithBefore': '使用',
  'public.madeWithAfter': ' 製作。',
  'public.notFoundTitle': '找不到連結',
  'public.notFoundBody': '連結不存在或已被刪除',
  'public.createNew': '建立新連結',
  'api.contentType': '請使用 application/json',
  'api.designRequired': '請提供設計 JSON',
  'api.bodyTooLarge': '內容不可超過 64 KiB',
  'api.badJson': 'JSON 格式錯誤',
  'api.notFound': '找不到此連結',
  'api.crossOrigin': '不允許跨網站寫入',
  'api.rateLimit': '操作太頻繁，請在一分鐘後再試',
  'api.invalidDesign': '設計內容有誤',
  'api.unsupported': '不支援此操作',
  'api.invalidToken': '管理密鑰無效，請使用完整的私人管理連結',
  'api.serviceConfig': '服務設定尚未完成，請聯絡網站管理者',
  'api.unavailable': '服務暫時無法處理，請稍後再試',
  'validation.invalid': '輸入內容無效',
  'validation.urlRequired': '請填寫網址',
  'validation.urlTooLong': '網址不可超過 {max} 字元',
  'validation.urlInvalid': '請輸入完整 HTTP 或 HTTPS 網址（不可包含帳號密碼）',
  'validation.textRequired': '文字不可空白',
  'validation.textTooLong': '文字不可超過 4,000 字元',
  'validation.emojiRequired': '請填寫 emoji 名稱或 ID',
  'validation.buttonRequired': '按鈕需要標籤或 emoji',
  'validation.componentRequired': '至少新增一個元件',
  'validation.componentLimit': '包含容器與附屬元件，最多 40 個元件',
  'validation.titleRequired': '請填寫預覽標題',
  'starter.title': '把好點子，分享出去。',
  'starter.description': '在 Discord 打造吸睛的互動卡片，完整呈現你的點子。',
  'starter.hero': '## 把好點子，分享出去。\n在 Discord 打造專屬的精美互動卡片。',
  'starter.body':
    '✦ **專為社群打造**\n展示作品、發布公告，或凝聚社群成員。\n\n從左側開始編輯，自訂卡片內容與樣式。',
  'starter.explore': '探索更多',
  'starter.text': '在這裡寫下你的內容…',
  'starter.section': '### 新的圖文區塊\n讓文字與圖片一起說故事。',
  'starter.paragraph': '新的文字段落',
  'starter.learnMore': '了解更多',
} as const;

export type MessageKey = keyof typeof zhHant;

const en: Record<MessageKey, string> = {
  'meta.title': 'Forma — Discord Link Designer',
  'meta.description': 'Design a Discord Components V2 preview and share it with one short link.',
  'language.label': 'Language',
  'language.zhHant': '繁中',
  'language.en': 'English',
  'app.topbarTitle': 'Discord Card Designer',
  'app.docs': 'Developer docs',
  'hero.title': 'Give your content a better entrance.',
  'hero.manageTitle': 'Manage card content',
  'hero.description': 'Combine text, media, and buttons to build a custom card in real time.',
  'hero.status': 'No sign-up · Ready to use',
  'management.missingToken':
    'The management key is missing. Use the complete private link that includes #token.',
  'management.deleted': 'This content has been deleted.',
  'management.createNew': 'Create a new card ↗',
  'management.prefix': 'Managing',
  'management.suffix':
    '. Saving updates the public content immediately; Discord preview caching may take a moment.',
  'workspace.label': 'Workspace',
  'workspace.edit': 'Edit design',
  'workspace.preview': 'Live preview',
  'editor.modeLabel': 'Editing mode',
  'editor.visual': 'Visual editor',
  'editor.managerMode': 'Private management mode',
  'editor.storageFailed': 'Draft could not be saved',
  'editor.draftSaved': 'Draft saved automatically',
  'editor.previewInfo': 'Preview details',
  'editor.previewInfoHint': 'Title, description, and cover image',
  'editor.previewTitle': 'Preview title',
  'editor.previewDescription': 'Preview description',
  'editor.coverUrl': 'Cover URL (optional)',
  'editor.mediaPrefixHint':
    'Discord attachment URLs from cdn.discordapp.com automatically use the media prefix.',
  'editor.containerStyle': 'Container style',
  'editor.containerColor': 'Container color',
  'editor.accentColor': 'Accent color',
  'editor.none': 'None',
  'editor.clear': 'Clear',
  'editor.hideContent': 'Hide content',
  'editor.compose': 'Build your content',
  'editor.componentCount': '{count} / 40 components',
  'component.text': 'Text',
  'component.section': 'Section',
  'component.gallery': 'Media gallery',
  'component.separator': 'Separator',
  'component.row': 'Button row',
  'component.dragTitle': 'Drag to reorder',
  'component.dragLabel': 'Drag component {index}',
  'component.moveUp': 'Move up',
  'component.moveUpLabel': 'Move component {index} up',
  'component.moveDown': 'Move down',
  'component.moveDownLabel': 'Move component {index} down',
  'component.copy': 'Duplicate',
  'component.copyLabel': 'Duplicate component {index}',
  'component.delete': 'Delete',
  'component.deleteLabel': 'Delete component {index}',
  'component.add': 'Add component',
  'json.import': 'Import',
  'json.export': 'Export',
  'json.hint':
    'Paste { component: … } directly. Valid JSON syncs to the visual editor; unfinished JSON is preserved.',
  'json.invalid': 'The JSON is invalid. Check the brackets, commas, and quotation marks.',
  'validation.summary': 'A few things need attention before publishing',
  'validation.more': '{count} more errors',
  'validation.bodyTooLarge': 'The design exceeds 64 KiB.',
  'validation.importTooLarge': 'Imported files cannot exceed 64 KiB',
  'editor.managerVerified': 'Management access verified',
  'editor.managerKeyAfterPublish': 'Receive a private management key after publishing',
  'json.importFile': 'Import JSON',
  'preview.channel': 'preview-channel',
  'preview.author': 'Your name',
  'preview.today': 'Today at 12:00',
  'preview.note': 'Discord preview simulation. Actual rendering may differ in Discord.',
  'publish.ready': 'Ready to publish',
  'publish.description1': 'Create a unique URL and paste it into Discord to display your card.',
  'publish.description2': 'Permanent until deleted. No account required.',
  'publish.loading': 'Loading design…',
  'publish.save': 'Save changes',
  'publish.create': 'Generate short link',
  'publish.publicPage': 'Public page',
  'publish.managementCredential': 'Management credential included',
  'publish.delete': 'Delete this link',
  'embed.copy': 'Copy website embed code',
  'embed.hint':
    'No short link needed. Paste the code into your website’s HTML <head>, then share that page’s URL on Discord. Include the code in the HTML returned by your server.',
  'embed.viewCode': 'View embed code',
  'embed.code': 'Website embed code',
  'embed.invalid': 'Complete the components and fix any JSON errors first.',
  'embed.copyFailed':
    'Clipboard access is unavailable. The embed code is selected for manual copying.',
  'tip.title': 'Design tip',
  'tip.body': 'Add a strong headline, image, or button to make your card more engaging.',
  'dialog.closeResult': 'Close publishing result',
  'dialog.updated': 'Card updated',
  'dialog.created': 'Card created successfully',
  'dialog.shareHint': 'Paste the URL into a Discord channel to expand the card automatically.',
  'dialog.publicLink': 'Public short link',
  'dialog.copyPublic': 'Copy short link',
  'dialog.openPage': 'Open public page',
  'dialog.managerTitle': 'Save your private management link',
  'dialog.managerBody':
    'This is the only credential that can edit or delete the content. Store it safely, do not share it publicly, and note that it cannot be recovered.',
  'dialog.privateLink': 'Private management link',
  'dialog.copyPrivate': 'Copy management link',
  'dialog.savePrivate': 'Save management link',
  'dialog.cacheNote': 'Existing Discord previews may take some time to update after changes.',
  'dialog.deleteTitle': 'Delete this short link?',
  'dialog.deleteBody': 'The public page will become unavailable. This action cannot be undone.',
  'dialog.keep': 'Keep link',
  'dialog.deleting': 'Deleting…',
  'dialog.confirmDelete': 'Confirm delete',
  'download.managerTitle': 'Forma private management link (do not share)',
  'download.publicTitle': 'Public short link',
  'toast.copied': 'Copied to clipboard',
  'toast.copyFailed': 'Clipboard access is unavailable. Select and copy the URL manually.',
  'toast.deleted': 'Short link deleted',
  'toast.jsonLoaded': 'JSON loaded. Review the validation result.',
  'error.loadLink': 'Unable to load the link',
  'error.serverNoLink': 'The server did not return a link. Try again later.',
  'error.publish': 'Publishing failed. Try again later.',
  'error.delete': 'Deletion failed',
  'field.mediaUrl': 'Media URL',
  'field.mediaPrefixHint':
    'Discord attachment URLs from cdn.discordapp.com automatically receive the configured media prefix.',
  'field.buttonText': 'Button text',
  'field.openLink': 'Open link',
  'field.destinationUrl': 'Destination URL',
  'field.emojiOptions': 'Emoji and button options',
  'field.emojiExample': 'Example: ✨',
  'field.customEmojiId': 'Custom emoji ID',
  'field.customEmojiPlaceholder': 'Optional Discord emoji ID',
  'field.animatedEmoji': 'Animated emoji',
  'field.disableButton': 'Disable button',
  'field.thumbnailUrl': 'Thumbnail URL',
  'field.imageAlt': 'Image alt text',
  'field.thumbnailSpoiler': 'Hide thumbnail (Spoiler)',
  'field.textContent': 'Text content',
  'field.markdownHint': 'Supports Markdown: headings, bold text, lists, links, and ||spoilers||.',
  'field.showDivider': 'Show divider',
  'field.spacing': 'Vertical spacing',
  'field.spacingSmall': 'Small spacing',
  'field.spacingLarge': 'Large spacing',
  'field.buttonLegend': 'Button {index}',
  'field.deleteButton': 'Delete button {index}',
  'field.addButton': 'Add button',
  'field.sectionText': 'Section text {index}',
  'field.removeParagraph': 'Remove paragraph',
  'field.addParagraph': 'Add paragraph',
  'field.accessory': 'Side accessory',
  'field.thumbnail': 'Thumbnail',
  'field.linkButton': 'Link button',
  'field.mediaLegend': 'Media {index}',
  'field.deleteMedia': 'Delete media {index}',
  'field.mediaAlt': 'Media alt text',
  'field.mediaSpoiler': 'Hide media (Spoiler)',
  'field.addMedia': 'Add image or video',
  'field.mediaFormats':
    'Images: PNG, GIF, JPEG, WebP, AVIF. Video: MP4, MOV, WebM. URLs must be publicly accessible.',
  'preview.revealTitle': 'Click or focus to reveal',
  'preview.reveal': 'Click to reveal hidden content',
  'preview.thumbnail': 'Thumbnail',
  'preview.addMediaUrl': 'Add a media URL',
  'preview.mediaFailed': 'Media could not be loaded',
  'preview.openOriginal': 'Open original URL ↗',
  'preview.video': 'Video',
  'preview.galleryImage': 'Gallery image',
  'homepage.title': 'Forma — Discord Components V2 Card Generator',
  'homepage.description':
    'Combine text, media, and buttons into polished Discord cards. No account required.',
  'homepage.hero':
    '## Forma · Give your content a better entrance.\nArrange rich components and present them beautifully in Discord.',
  'homepage.features':
    '✦ **Flexible building** — Text, images, video, and interactive buttons\n✦ **Live preview** — Visual editing and JSON stay in sync\n✦ **Ready instantly** — Permanent links with a private management key',
  'homepage.start': 'Start designing',
  'public.preview': 'Card preview',
  'public.userNotice': 'This page contains user-created content.',
  'public.madeWithBefore': 'Made with',
  'public.madeWithAfter': '.',
  'public.notFoundTitle': 'Link not found',
  'public.notFoundBody': 'This link does not exist or has been deleted',
  'public.createNew': 'Create a new link',
  'api.contentType': 'Use application/json',
  'api.designRequired': 'Provide design JSON',
  'api.bodyTooLarge': 'Content cannot exceed 64 KiB',
  'api.badJson': 'Invalid JSON',
  'api.notFound': 'Link not found',
  'api.crossOrigin': 'Cross-site writes are not allowed',
  'api.rateLimit': 'Too many operations. Try again in one minute.',
  'api.invalidDesign': 'The design is invalid',
  'api.unsupported': 'This operation is not supported',
  'api.invalidToken': 'The management key is invalid. Use the complete private management link.',
  'api.serviceConfig': 'The service is not fully configured. Contact the site administrator.',
  'api.unavailable': 'The service is temporarily unavailable. Try again later.',
  'validation.invalid': 'The input is invalid',
  'validation.urlRequired': 'Enter a URL',
  'validation.urlTooLong': 'The URL cannot exceed {max} characters',
  'validation.urlInvalid': 'Enter a complete HTTP or HTTPS URL without credentials',
  'validation.textRequired': 'Text cannot be empty',
  'validation.textTooLong': 'Text cannot exceed 4,000 characters',
  'validation.emojiRequired': 'Enter an emoji name or ID',
  'validation.buttonRequired': 'A button needs a label or emoji',
  'validation.componentRequired': 'Add at least one component',
  'validation.componentLimit': 'The container and nested items can contain at most 40 components',
  'validation.titleRequired': 'Enter a preview title',
  'starter.title': 'Share your best ideas.',
  'starter.description':
    'Create an eye-catching interactive card that presents your idea beautifully in Discord.',
  'starter.hero': '## Share your best ideas.\nCreate a polished interactive card made for Discord.',
  'starter.body':
    '✦ **Built for communities**\nShowcase projects, publish announcements, or bring members together.\n\nStart editing to customize the card content and style.',
  'starter.explore': 'Explore more',
  'starter.text': 'Write your content here…',
  'starter.section': '### New section\nLet text and imagery tell the story together.',
  'starter.paragraph': 'New text paragraph',
  'starter.learnMore': 'Learn more',
};

export const messages: Record<Locale, Record<MessageKey, string>> = { 'zh-Hant': zhHant, en };

export function t(
  locale: Locale,
  key: MessageKey,
  values: Record<string, string | number> = {},
): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

export function parseLocaleParam(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'en') return 'en';
  if (normalized === 'zh-hant') return 'zh-Hant';
  return null;
}

export function localeFromLanguageTag(value: string | null | undefined): Locale | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase().replaceAll('_', '-');
  if (
    normalized === 'zh' ||
    normalized === 'zh-hant' ||
    normalized.startsWith('zh-hant-') ||
    /^zh-(tw|hk|mo)(?:-|$)/.test(normalized)
  )
    return 'zh-Hant';
  return 'en';
}

export function parseLocaleCookie(cookie: string | null | undefined): Locale | null {
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === LOCALE_COOKIE) {
      try {
        return parseLocaleParam(decodeURIComponent(value.join('=')));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function parseAcceptLanguage(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const tags = value
    .split(',')
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(';');
      const qValue = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qValue ? Number(qValue.trim().slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter(({ tag, quality }) => !!tag && tag !== '*' && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return localeFromLanguageTag(tags[0]?.tag);
}

export function resolveLocale(options: {
  query?: string | null;
  cookie?: string | null;
  languages?: readonly string[] | null;
  acceptLanguage?: string | null;
}): Locale {
  const explicit = parseLocaleParam(options.query);
  if (explicit) return explicit;
  const stored = parseLocaleCookie(options.cookie);
  if (stored) return stored;
  const language = options.languages?.find((value) => !!value.trim());
  return (
    localeFromLanguageTag(language) ?? parseAcceptLanguage(options.acceptLanguage) ?? DEFAULT_LOCALE
  );
}

export function localeCookie(locale: Locale): string {
  return (
    LOCALE_COOKIE + '=' + encodeURIComponent(locale) + '; Path=/; Max-Age=31536000; SameSite=Lax'
  );
}

export function addLocaleParam(value: string, locale: Locale): string {
  const url = new URL(value, 'https://forma.local');
  url.searchParams.set('lang', locale);
  return value.startsWith('http') ? url.toString() : url.pathname + url.search + url.hash;
}
