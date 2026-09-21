import { expect, test } from '@playwright/test';

test('homepage has a crawler-readable Components V2 embed and a working editor', async ({
  page,
}) => {
  const response = await page.request.get('/', { headers: { 'User-Agent': 'Discordbot/2.0' } });
  expect(response.status()).toBe(200);
  const body = await response.text();
  const match =
    /<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/.exec(body);
  expect(match).not.toBeNull();
  const payload = JSON.parse(match![1]);
  expect(payload.component.type).toBe(17);
  expect(payload.component.components.at(-1).components[0].url).toBe('http://127.0.0.1:5173/');
  expect(body).toContain('property="og:type" content="website"');
  await page.goto('/');
  await expect(page.locator('.editor-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: '生成短連結', exact: true })).toBeEnabled();
});

test('English locale persists, preserves authored content, and supports management', async ({
  page,
}) => {
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('button', { name: 'Generate short link', exact: true }),
  ).toBeEnabled();
  await page.getByLabel('Text content', { exact: true }).first().fill('Do not translate this');

  const language = page.locator('.language-select select');
  await language.selectOption('zh-Hant');
  await expect(page.getByRole('button', { name: '生成短連結', exact: true })).toBeVisible();
  await expect(page.getByLabel('文字內容', { exact: true }).first()).toHaveValue(
    'Do not translate this',
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await expect(page.getByLabel('文字內容', { exact: true }).first()).toHaveValue(
    'Do not translate this',
  );

  await page.locator('.language-select select').selectOption('en');
  await page
    .locator('.component-palette')
    .getByRole('button', { name: 'Text', exact: true })
    .click();
  await expect(page.getByLabel('Text content', { exact: true }).last()).toHaveValue(
    'Write your content here…',
  );

  await page.getByRole('button', { name: 'Generate short link', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Card created successfully');
  const managerUrl = await page
    .getByRole('textbox', { name: 'Private management link', exact: true })
    .inputValue();
  const manager = new URL(managerUrl);
  manager.searchParams.set('lang', 'en');
  await page.goto(manager.toString());
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Text content', { exact: true }).first()).toHaveValue(
    'Do not translate this',
  );
  await page.getByRole('button', { name: 'Delete this link', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Short link deleted');
});

test('visual editing, reorder, duplicate, draft restore, JSON roundtrip and invalid import', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByLabel('文字內容', { exact: true })
    .fill('## Browser test\n**Bold** and ||secret||');
  await expect(page.locator('.discord-card')).toContainText('Browser test');
  await expect(page.locator('.text-spoiler')).toHaveText('secret');
  await page.getByRole('button', { name: '複製元件 1', exact: true }).click();
  await expect(page.locator('.component-block')).toHaveCount(5);
  await page.getByRole('button', { name: '下移元件 2', exact: true }).click();
  await page.getByRole('button', { name: '刪除元件 3', exact: true }).click();
  await expect(page.locator('.component-block')).toHaveCount(4);
  await page.reload();
  await expect(page.getByLabel('文字內容', { exact: true })).toHaveValue(
    '## Browser test\n**Bold** and ||secret||',
  );
  await page.getByRole('tab', { name: 'JSON', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Component JSON' });
  const payload = JSON.parse(await editor.inputValue());
  payload.component.components[0].content = '# JSON roundtrip';
  await editor.fill(JSON.stringify(payload));
  await expect(page.locator('.discord-card')).toContainText('JSON roundtrip');
  await page.getByRole('tab', { name: '視覺編輯', exact: true }).click();
  await expect(page.getByLabel('文字內容', { exact: true })).toHaveValue('# JSON roundtrip');
  await page.getByRole('tab', { name: 'JSON', exact: true }).click();
  await editor.fill('{broken');
  await expect(page.getByRole('button', { name: '生成短連結', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Component JSON' })).toHaveValue('{broken');
  await expect(page.locator('.validation')).toContainText('JSON 格式有誤');
});

test('all component fields, CDN prefix and JSON export', async ({ page }) => {
  await page.route('https://dccdngen.avianjay.sbs/**', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  await page
    .locator('.component-palette')
    .getByRole('button', { name: '圖文區塊', exact: true })
    .click();
  await page
    .getByLabel('縮圖網址', { exact: false })
    .fill('https://cdn.discordapp.com/attachments/test.png?ex=abc');
  await page.getByLabel('圖片替代文字').click();
  await expect(page.getByLabel('縮圖網址', { exact: false })).toHaveValue(
    'https://dccdngen.avianjay.sbs/https://cdn.discordapp.com/attachments/test.png?ex=abc',
  );
  await page.getByLabel('圖片替代文字').fill('Thumbnail');
  await page.getByRole('button', { name: '新增段落' }).click();
  await expect(page.getByLabel('區塊文字 2')).toBeVisible();
  await page
    .locator('.component-palette')
    .getByRole('button', { name: '媒體相簿', exact: true })
    .click();
  await page
    .getByLabel('媒體網址', { exact: false })
    .fill('https://media.discordapp.net/attachments/clip.mp4');
  await page.getByLabel('媒體替代文字').click();
  await expect(page.getByLabel('媒體網址', { exact: false })).toHaveValue(
    'https://media.discordapp.net/attachments/clip.mp4',
  );
  await page.getByLabel('隱藏媒體（Spoiler）').check();
  await page
    .locator('.component-palette')
    .getByRole('button', { name: '分隔線', exact: true })
    .click();
  await page.getByLabel('上下間距').selectOption('2');
  await page
    .locator('.component-palette')
    .getByRole('button', { name: '按鈕列', exact: true })
    .click();
  await page.getByLabel('按鈕文字').fill('My button');
  await page.getByRole('tab', { name: 'JSON', exact: true }).click();
  const payload = JSON.parse(await page.getByLabel('Component JSON').inputValue());
  expect(payload.component.components[4].accessory.media.url).toMatch(
    /^https:\/\/dccdngen\.avianjay\.sbs\/https:\/\/cdn\.discordapp\.com/,
  );
  expect(payload.component.components[5].items[0].media.url).toBe(
    'https://media.discordapp.net/attachments/clip.mp4',
  );
  expect(payload.component.components[6].spacing).toBe(2);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '匯出', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('component-embed.json');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  });
  await expect(page.locator('.validation')).toContainText('JSON 格式有誤');
});

test('publish, crawl without JavaScript, copy, save manager link, update and delete', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: '生成短連結', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '複製短連結', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已複製');
  const shareUrl = await page.getByLabel('公開短連結').inputValue();
  const managerUrl = await page
    .getByRole('textbox', { name: '私人管理連結', exact: true })
    .inputValue();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '保存管理連結', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('forma-management.txt');
  const crawler = await page.request.get(shareUrl, { headers: { 'User-Agent': 'Discordbot/2.0' } });
  expect(crawler.status()).toBe(200);
  expect(await crawler.text()).toContain('id="discord:component-embed" type="application/json"');
  const noJs = await context.browser()!.newContext({ javaScriptEnabled: false });
  const publicPage = await noJs.newPage();
  await publicPage.goto(shareUrl + '?lang=en');
  await expect(publicPage.locator('.user-content-notice')).toHaveText(
    'This page contains user-created content.',
  );
  await expect(publicPage.locator('.discord-card')).toContainText('把好點子，分享出去。');
  await noJs.close();
  await page.goto(managerUrl);
  await expect(page.getByLabel('文字內容', { exact: true })).toBeEnabled();
  await page.getByLabel('文字內容', { exact: true }).fill('## Updated in browser');
  await page.getByRole('button', { name: '儲存變更', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await (await page.request.get(shareUrl)).text()).toContain('Updated in browser');
  await page.getByRole('button', { name: '關閉發布結果' }).click();
  await page.getByRole('button', { name: '刪除此連結', exact: true }).click();
  await page.getByRole('button', { name: '保留連結', exact: true }).click();
  expect((await page.request.get(shareUrl)).status()).toBe(200);
  await page.getByRole('button', { name: '刪除此連結', exact: true }).click();
  await page.getByRole('button', { name: '確認刪除', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已刪除');
  expect((await page.request.get(shareUrl)).status()).toBe(404);
});

test('mobile workspace switches panels without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.editor-panel')).toBeVisible();
  await expect(page.locator('.preview-panel')).toBeHidden();
  await page.getByRole('button', { name: '即時預覽', exact: true }).click();
  await expect(page.locator('.preview-panel')).toBeVisible();
  await expect(page.locator('.editor-panel')).toBeHidden();
  await expect(page.getByRole('button', { name: '生成短連結', exact: true })).toBeEnabled();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(fits).toBe(true);
  await page.getByRole('button', { name: '編輯設計', exact: true }).click();
  await expect(page.getByLabel('文字內容', { exact: true })).toBeVisible();
  await page.locator('.language-select select').selectOption('en');
  await expect(page.getByRole('button', { name: 'Edit design', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unfinished visual drafts survive reload without losing components', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('.component-palette')
    .getByRole('button', { name: '媒體相簿', exact: true })
    .click();
  await page.getByLabel('媒體網址', { exact: true }).fill('https://');
  await expect(page.getByRole('button', { name: '生成短連結', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('tab', { name: '視覺編輯', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.component-block')).toHaveCount(5);
  await page.locator('.component-block').last().locator('.component-select').click();
  await expect(page.getByLabel('媒體網址', { exact: true })).toHaveValue('https://');
});

test('drag and drop reordering of components', async ({ page }) => {
  await page.goto('/');
  const blocks = page.locator('.component-block');
  await expect(blocks).toHaveCount(4);
  await expect(blocks.nth(0)).toContainText('文字');
  await expect(blocks.nth(1)).toContainText('分隔線');

  // Drag component 1 (Divider) to above component 0 (Text)
  const handle1 = blocks.nth(1).locator('.drag-handle');
  await handle1.dragTo(blocks.nth(0));

  await expect(blocks.nth(0)).toContainText('分隔線');
  await expect(blocks.nth(1)).toContainText('文字');
});
