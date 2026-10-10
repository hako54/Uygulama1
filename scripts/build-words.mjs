// Generates the word data the game ships with:
//  - src/dictionary.ts: every 5-letter word accepted as a guess
//  - src/words.ts: the daily answers
// Sources (all MIT): wordle-tr-dictionary (TDK based), an-array-of-english-words (Letterpress),
// wordlist-english (SCOWL; sizes 10 and 20 are the most common words).
// Run with: npm run build:words
//
// Once the app is published, only APPEND new answers: the daily word is picked from a fixed
// shuffle of this list, so changing existing entries changes past and future puzzles.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const tdk = require('wordle-tr-dictionary/data/generated/words.json');
const letterpress = require('an-array-of-english-words');
const scowl = require('wordlist-english');

const ALPHABET = {
  tr: /^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$/u,
  en: /^[A-Z]{5}$/,
};

// Hand-picked answers kept from the first version.
const CURATED = {
  tr: `KALEM KİTAP ARABA DENİZ GÜNEŞ BULUT ÇİÇEK ELMAS ŞEKER MASAL HAYAT DÜNYA SEVGİ BAHAR YAZAR ÇOCUK
KADIN ERKEK ZAMAN TARİH DOĞRU KÖPEK HAVLU YATAK SABAH AKŞAM ÖĞLEN KAHVE LİMON ARMUT KİRAZ KAVUN
KABAK BİBER SOĞAN MARUL HAVUÇ EKMEK BÖREK SİMİT ÇORBA PİLAV KEBAP TATLI BALIK TAVUK ASLAN TİLKİ
ZEBRA KARGA SERÇE ŞAHİN YILAN ÖRDEK HOROZ FENER KÖPRÜ SARAY ŞEHİR ORMAN NEHİR FIRIN TABAK ÇATAL
KAŞIK BIÇAK SEHPA DOLAP RADYO PERDE SİLGİ SINIF MÜZİK ŞARKI GİTAR KEMAN DAVUL RESİM FIRÇA YÜZME
GÜREŞ HUZUR SABIR CESUR KORKU MUTLU ÜZGÜN GÜZEL BÜYÜK KÜÇÜK HIZLI YAVAŞ BEYAZ SİYAH YEŞİL PEMBE
ALTIN GÜMÜŞ DEMİR BAKIR DALGA KAYIK LİMAN KAĞIT POSTA EKRAN KABLO ROBOT AYRAN KÖFTE DÖNER LOKUM
HELVA KAŞAR İNCİR BADEM CEVİZ HURMA POLİS ASKER PİLOT TERZİ`,
  en: `APPLE BEACH BRAIN BREAD BRICK CANDY CHAIR CHESS CLOUD COAST CRANE DANCE DREAM EAGLE EARTH FEAST
FIELD FLAME FLOUR FROST FRUIT GHOST GLOBE GRAPE GRASS HEART HONEY HORSE HOUSE JUICE KNIFE LEMON
LIGHT MAGIC MANGO MONEY MOUSE MUSIC NIGHT OCEAN OLIVE PAINT PEACE PEARL PIANO PIZZA PLANT PLATE
QUEEN RADIO RIVER ROBOT SALAD SHEEP SHELL SHIRT SMILE SNAKE SPACE SPOON STONE STORM SUGAR TABLE
TIGER TOAST TOWER TRAIN TRUCK WATER WHALE WORLD YOUTH ZEBRA BLOOM BRAVE CHARM CLOCK CROWN DAISY
FAITH GIANT HAPPY LAUGH LUCKY MAPLE NOBLE PRIDE QUIET RAINY ROUND SHINE SWEET THINK TRUST UNITY
VIVID WHEAT ACORN ANGEL BADGE BERRY BLAZE CABIN CAMEL COMET CORAL DELTA EMBER FABLE FAIRY FLUTE
GRACE HAVEN IVORY JEWEL KOALA LLAMA LUNAR MEDAL NORTH ORBIT OTTER PANDA PEACH PIXEL PLUME RAVEN
SCARF SOLAR SPARK STEAM SWIFT TULIP VAPOR WALTZ`,
};

// Source answers that make poor puzzles: names, religious or ethnic terms, slurs and vulgar
// words, inflected forms ("ADAMA", "VERDİ"), plurals, comparatives and obscure words.
const EXCLUDE = {
  tr: `ABBAS AFGAN ALEVİ ALLAH ALMAN APRİL AYDIN BEGÜM BURAK BURCU CELAL CEMAL CEMİL CEREN CİHAN ÇEÇEN
ÇETİN ENGİN ERİKA FATİH HAKAN HAVVA HELEN HİNDU İSKOÇ JAPON KEMAL KERİM LEYLA MACAR MOĞOL MURAT
ORİON RECEP SALİM SELİM ŞABAN TOKYO VENÜS YUNAN MİRZA HALİM LATİF SELEN KADİR MESUT RUSÇA ÇİNCE
ÇİNLİ LATİN TONYA SUDAN İNCİL İSLAM MESİH VAHİY NAMAZ İBLİS TANRI HAÇLI İLAHİ GÜNAH HELAL HARAM
HAHAM KÂFİR BOKLU YARAK PENİS SPERM SEKSİ FUHUŞ KAHPE EROİN ESRAR SİDİK İDRAR DIŞKI SÜMÜK SEVİŞ
ZENCİ IRKÇI GEYŞA ANGUT LAVUK MORUK HÖDÜK SALAK APTAL AHMAK ENAYİ ŞİŞKO BÜCÜR DENYO NONOŞ VAROŞ
KÜLOT SAPIK VOTKA VİSKİ ŞARAP LİKÖR ALKOL CESET TÜMÖR HADIM İSHAL KABIZ FITIK ÜLSER TACİZ ADAMA
ADINA BARDA BASTI BAŞTA BENDE BİLİR BİNDİ BİNER ÇIKAN ÇIKIN GELEN GİREN GÜCÜN GÜNDE KAÇTA KALAN
KESEN KAYAN YÜKÜN VERDİ VARAN TAPAN YAĞAR YÜZER ORADA ORAYA ORASI ÖBÜRÜ YURDU TOPLA TONLA ZORLA
HIZLA TUZLA KAÇAR KOYAR KAYAR YATIR BATAR BASAR DUYAR ÇEKER SEVER İSTER YETER SİZCE BİZCE BENCE
SENCE DEĞİN DEĞİŞ ÇALIŞ YAPIŞ TANIŞ TANIT KOŞUN ŞARKİ TAKİM GAYRİ BAKİR KADEM KALIM BAĞIM BAĞIN
SARPA KİNCİ ŞİLİN ODALI ORALI PİNES MAMBO LARGO PAPEL KESAT HAŞAT AKSAM ASLEN KABİL NAZİR YAKİN
ZANLI DEŞİK DİZİM SORUM PORTO ÇAKRA HURRA HAYDA BASİL LİRET RUBLE DİNAR DÜŞES MARKİ YARDA YAŞÇA
ÇAPLI GİRDİ ÇIKTI OLMUŞ ÖLMÜŞ ERMİŞ YEMİŞ KAYIN BİTAP`,
  en: `BIBLE BIGOT MORON IDIOT DEVIL CURSE DEITY CYNIC NAKED VOMIT SLAVE LAGER CRASS DATUM DEBUG PENDS
UNSET INTER CIRCA SIGMA FIVER LORRY PENCE VICAR MUMMY DITTO FLIED CRIES TRIES DRIES SPIES FLIES
FRIES ROMAN WHOOP LEACH ABORT ABUSE DRUNK RARER NICER FINER SAFER NEWER WIDER WISER FEWER OLDER
TAKER EATER GLEAN BANAL INANE IRATE DEALT UNDID HENCE OUGHT WHOSE THOSE THESE WHICH THEIR THERE
WHERE WHILE WOULD COULD SHALL MIGHT SINCE UNTIL AMONG ABOUT ABOVE AFTER AGAIN ALONG OTHER EVERY
BEING SADLY ODDLY BADLY NEWLY FULLY TRULY CIRCA EMBED PARSE REUSE UNIFY AXIOM RABID LIBEL GNOME
GOODY HALVE HORDE MANIA NASTY PENNY SNEAK SPOOF SPOOL SPOUT`,
};

const up = (w, lang) => (lang === 'tr' ? w.toLocaleUpperCase('tr-TR') : w.toUpperCase());
const words = (s) => s.split(/\s+/).filter(Boolean);

function clean(list, lang) {
  return [...new Set(list.map((w) => up(w, lang)))].filter((w) => ALPHABET[lang].test(w)).sort();
}

// SCOWL lists inflections separately; drop plurals, past tenses and -ing forms of listed words.
function commonEnglish() {
  const all = new Set(Object.keys(scowl).filter((k) => /^english(\/american)?\/\d+$/.test(k)).flatMap((k) => scowl[k]));
  const common = ['english/10', 'english/20', 'english/american/10', 'english/american/20'].flatMap((k) => scowl[k]);
  const inflected = (w) =>
    (w.endsWith('s') && (all.has(w.slice(0, -1)) || (w.endsWith('es') && all.has(w.slice(0, -2))))) ||
    (w.endsWith('ed') && (all.has(w.slice(0, -2)) || all.has(w.slice(0, -1)))) ||
    w.endsWith('ing');
  return common.filter((w) => /^[a-z]{5}$/.test(w) && !inflected(w));
}

function answers(source, lang) {
  const exclude = new Set(words(EXCLUDE[lang]));
  return clean([...words(CURATED[lang]), ...source], lang).filter((w) => !exclude.has(w));
}

const dictionary = {
  tr: clean(tdk.accepted_words, 'tr'),
  en: clean([...letterpress, ...commonEnglish()], 'en'),
};
const daily = {
  tr: answers(tdk.target_words, 'tr'),
  en: answers(commonEnglish(), 'en'),
};

const header = `// Generated by scripts/build-words.mjs — do not edit by hand.\n`;
const body = (lists) =>
  Object.entries(lists)
    .map(([lang, list]) => `  ${lang}: '${list.join(' ')}',`)
    .join('\n');

writeFileSync(
  new URL('../src/dictionary.ts', import.meta.url),
  header +
    `// Space-separated so the bundle stays small; split into a Set on first use.\n` +
    `export const DICTIONARY = {\n${body(dictionary)}\n};\n`,
);
writeFileSync(
  new URL('../src/words.ts', import.meta.url),
  header +
    `export const WORDS = {\n${body(daily).replace(/',$/gm, "'.split(' '),")}\n};\n`,
);

for (const lang of ['tr', 'en']) {
  console.log(`${lang}: ${dictionary[lang].length} guesses, ${daily[lang].length} answers`);
}
