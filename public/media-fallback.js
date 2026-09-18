// Progressive enhancement only; the embed payload and page content are server-rendered.
document.addEventListener(
  'error',
  function (event) {
    const media = event.target;
    if (
      !(media instanceof HTMLImageElement || media instanceof HTMLVideoElement) ||
      !media.closest('.discord-card')
    )
      return;
    const fallback = document.createElement('div');
    fallback.className = 'media-placeholder';
    fallback.textContent = '媒體無法載入 ';
    const link = document.createElement('a');
    link.href = media.src;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = '開啟原始網址 ↗';
    fallback.append(link);
    media.replaceWith(fallback);
  },
  true,
);
