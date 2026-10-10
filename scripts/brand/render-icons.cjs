/* global __dirname, Buffer */
// Renders the app icon set into assets/ from one SVG mark.
// Run with: node scripts/brand/render-icons.cjs
const path = require('node:path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '../../assets');
const GREEN = '#538d4e';
const YELLOW = '#c9b458';
const BG = '#121213';

// A bold geometric "K", drawn as shapes so it renders the same on every machine.
const K = `
  <rect x="372" y="412" width="76" height="260"/>
  <polygon points="446,512 532,412 628,412 446,626"/>
  <polygon points="486,566 546,504 652,672 556,672"/>`;

// The mark: a yellow tile tilted behind a green "K" tile. `scale` shrinks it into Android's
// safe zone; `mono` draws the white silhouette Android 13+ uses for themed icons.
function mark({ scale = 1, mono = false } = {}) {
  const tile = '<rect x="232" y="292" width="500" height="500" rx="72"/>';
  const back = '<rect x="430" y="170" width="380" height="380" rx="56" transform="rotate(14 620 360)"/>';
  const body = mono
    ? `<mask id="cut"><rect width="1024" height="1024" fill="#fff"/><g fill="#000">${K}</g></mask>
       <g fill="#fff" mask="url(#cut)"><g opacity="0.5">${back}</g>${tile}</g>`
    : `<clipPath id="tile">${tile}</clipPath>
       <g fill="${YELLOW}">${back}</g>
       <g fill="${GREEN}">${tile}</g>
       <rect x="232" y="742" width="500" height="50" fill="#000" opacity="0.18" clip-path="url(#tile)"/>
       <g fill="#fff">${K}</g>`;
  // Shift left/down a little so the pair of tiles, not the front tile, sits in the middle.
  return `<g transform="translate(512 512) scale(${scale}) translate(-542 -480)">${body}</g>`;
}

const svg = (body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${bg ? `<defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#2a2a2d"/><stop offset="1" stop-color="${BG}"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>` : ''}
    ${body}
  </svg>`;

const FILES = [
  // iOS: opaque square, the system rounds the corners.
  { name: 'icon.png', svg: svg(mark({ scale: 0.92 }), true) },
  // Android adaptive: content within the central 66% safe zone, background drawn separately.
  { name: 'android-icon-foreground.png', svg: svg(mark({ scale: 0.62 })), transparent: true },
  { name: 'android-icon-background.png', svg: svg('', true) },
  { name: 'android-icon-monochrome.png', svg: svg(mark({ scale: 0.62, mono: true })), transparent: true },
  { name: 'splash-icon.png', svg: svg(mark({ scale: 1 })), transparent: true },
  { name: 'favicon.png', svg: svg(mark({ scale: 0.92 }), true), size: 48 },
];

(async () => {
  const browser = await chromium.launch();
  for (const f of FILES) {
    const size = f.size ?? 1024;
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">
        <img src="data:image/svg+xml;base64,${Buffer.from(f.svg).toString('base64')}" width="${size}" height="${size}">
      </body></html>`,
    );
    await page.waitForLoadState('load');
    await page.screenshot({ path: path.join(OUT, f.name), omitBackground: !!f.transparent });
    await page.close();
    console.log('wrote', f.name);
  }
  await browser.close();
})();
