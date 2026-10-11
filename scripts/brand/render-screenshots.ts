// Renders App Store and Google Play screenshots from the web build of the app.
//
//   npx expo export --platform web --output-dir dist
//   npx serve -s dist -l 4567 &
//   npx tsx scripts/brand/render-screenshots.ts http://localhost:4567
//
// Writes store/screenshots/<platform>/<lang>/<n>.png.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Browser, Page, chromium } from 'playwright';

import { dayNumber, wordForDay } from '../../src/game';
import { STRINGS } from '../../src/i18n';

const URL = process.argv[2] ?? 'http://localhost:4567';
const OUT = path.join(__dirname, '../../store/screenshots');

interface Device {
  width: number;
  height: number;
  scale: number;
}

const PHONE: Device = { width: 430, height: 932, scale: 3 };
const IPAD: Device = { width: 1032, height: 1376, scale: 2 }; // 13" iPad in points

// Each store format frames screens captured on one device.
const FORMATS: Record<string, { width: number; height: number; device: Device }> = {
  ios: { width: 1290, height: 2796, device: PHONE }, // 6.7"/6.9" iPhone
  ipad: { width: 2064, height: 2752, device: IPAD }, // 13" iPad, required while iPad is supported
  android: { width: 1080, height: 1920, device: PHONE }, // Play: long side ≤ 2× the short side
};

const SCENES = {
  tr: {
    guesses: ['KALEM', 'ÇORBA', 'GÜMÜŞ'],
    captions: [
      ['Her gün yeni bir kelime', '6 denemede bulabilir misin?'],
      ['Serini koru', 'Sonucunu arkadaşlarınla paylaş'],
      ['6 dilde oyna', 'Türkçe, English, Español ve dahası'],
      ['Beklemek yok', 'İstersen hemen ekstra kelime oyna'],
      ['10 saniyede öğren', 'Basit kurallar, bitmeyen eğlence'],
    ],
  },
  en: {
    guesses: ['CRANE', 'STORM', 'BROOK'],
    captions: [
      ['A new word every day', 'Can you get it in 6 tries?'],
      ['Keep your streak', 'Share your score with friends'],
      ['Play in 6 languages', 'English, Español, Français and more'],
      ["Can't wait?", 'Play extra words any time'],
      ['Learn in 10 seconds', 'Simple rules, endless fun'],
    ],
  },
} as const;

type Lang = keyof typeof SCENES;

const SAMPLE_STATS = {
  played: 47,
  won: 45,
  streak: 12,
  maxStreak: 21,
  distribution: [1, 5, 14, 15, 8, 2],
};

/** Captures the five app screens for one language on one device. */
async function captureApp(browser: Browser, lang: Lang, device: Device): Promise<Buffer[]> {
  const day = dayNumber();
  const answer = wordForDay(lang, day);
  const { guesses } = SCENES[lang];
  const t = STRINGS[lang];

  const open = async (storage: Record<string, unknown>) => {
    const page = await browser.newPage({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
    });
    await page.addInitScript((items: Record<string, unknown>) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(items)) localStorage.setItem(k, JSON.stringify(v));
    }, storage);
    await page.goto(URL);
    await page.waitForTimeout(2500);
    return page;
  };
  const base = {
    lang,
    seenHelp: true,
    reminders: 'on',
    [`stats:${lang}`]: { ...SAMPLE_STATS, lastWonDay: day - 1 },
  };
  const playing = { ...base, [`game:${lang}`]: { day, guesses, status: 'playing' } };
  const won = {
    ...base,
    [`game:${lang}`]: { day, guesses: [...guesses, answer], status: 'won' },
    [`stats:${lang}`]: { ...SAMPLE_STATS, lastWonDay: day, streak: 13 },
  };

  const shots: Buffer[] = [];
  const snap = async (page: Page) => {
    shots.push(await page.screenshot());
    await page.close();
  };

  // 1. A game in progress with a few letters typed.
  let page = await open(playing);
  for (const ch of Array.from(answer).slice(0, 3)) await page.getByText(ch, { exact: true }).last().click();
  await snap(page);

  // 2. Solved, with statistics.
  page = await open(won);
  await page.getByText('📊').click();
  await page.waitForTimeout(400);
  await snap(page);

  // 3. Language picker.
  page = await open(playing);
  await page.getByText(lang.toUpperCase(), { exact: true }).click();
  await page.waitForTimeout(400);
  await snap(page);

  // 4. Extra words.
  page = await open(won);
  await page.getByText('📊').click();
  await page.waitForTimeout(300);
  await page.getByText(`＋ ${t.playExtra}`).click();
  await page.waitForTimeout(400);
  await snap(page);

  // 5. How to play.
  page = await open({ ...playing, seenHelp: false });
  await snap(page);

  return shots;
}

function framePage(
  shot: Buffer,
  [title, subtitle]: readonly string[],
  { width, height, device }: { width: number; height: number; device: Device },
) {
  const captionHeight = Math.round(height * 0.2);
  const phoneHeight = height - captionHeight - Math.round(height * 0.04);
  const phoneWidth = Math.round((phoneHeight * device.width) / device.height);
  // Tablets have gentler corners than phones.
  const radius = Math.round(phoneWidth * (device === IPAD ? 0.04 : 0.11));
  const titleSize = Math.min(width * 0.085, 150);
  const img = `data:image/png;base64,${shot.toString('base64')}`;
  return `<html><body style="margin:0;width:${width}px;height:${height}px;overflow:hidden;
      background:radial-gradient(circle at 50% 0%, #2f5a2c 0%, #121213 60%);
      font-family:'Inter Display','Inter',Arial,sans-serif;color:#fff;text-align:center">
    <div style="height:${captionHeight}px;display:flex;flex-direction:column;justify-content:center;padding:0 ${width * 0.06}px">
      <div style="font-size:${titleSize}px;font-weight:900;line-height:1.05;letter-spacing:-0.5px">${title}</div>
      <div style="font-size:${titleSize * 0.5}px;font-weight:500;opacity:.85;margin-top:${titleSize * 0.25}px">${subtitle}</div>
    </div>
    <div style="margin:0 auto;width:${phoneWidth}px;height:${phoneHeight}px;border-radius:${radius}px;
        border:${Math.round(width * 0.012)}px solid #2c2c2e;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)">
      <img src="${img}" style="width:100%;height:100%;object-fit:cover;object-position:top">
    </div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  for (const lang of Object.keys(SCENES) as Lang[]) {
    const captures = new Map<Device, Buffer[]>();
    for (const [platform, size] of Object.entries(FORMATS)) {
      if (!captures.has(size.device)) captures.set(size.device, await captureApp(browser, lang, size.device));
      const shots = captures.get(size.device)!;
      const dir = path.join(OUT, platform, lang);
      mkdirSync(dir, { recursive: true });
      for (const [i, shot] of shots.entries()) {
        const page = await browser.newPage({ viewport: size });
        await page.setContent(framePage(shot, SCENES[lang].captions[i], size));
        await page.waitForLoadState('load');
        await page.screenshot({ path: path.join(dir, `${i + 1}.png`) });
        await page.close();
      }
      console.log(`wrote ${shots.length} ${platform} screenshots for ${lang}`);
    }
  }
  await browser.close();
})();
