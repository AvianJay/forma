import type { Container } from './design';

export function renderComponentEmbed(component: Container): string {
  const payload = JSON.stringify({ component }, null, 2)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  return `<script id="discord:component-embed" type="application/json">\n${payload}\n</script>`;
}
