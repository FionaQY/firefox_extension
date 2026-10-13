const languageCodeMap = {
  english: "en",
  español: "es",
  spanish: "es",
  français: "fr",
  french: "fr",
  deutsch: "de",
  german: "de",
  italiano: "it",
  italian: "it",
  português: "pt",
  portuguese: "pt",
  中文: "zh",
  chinese: "zh",
  日本語: "ja",
  japanese: "ja",
  한국어: "ko",
  korean: "ko",
  русский: "ru",
  russian: "ru",
  polski: "pl",
  polish: "pl",
  nederlands: "nl",
  dutch: "nl",
  svenska: "sv",
  swedish: "sv",
  norsk: "no",
  norwegian: "no",
  dansk: "da",
  danish: "da",
  suomi: "fi",
  finnish: "fi",
  čeština: "cs",
  czech: "cs",
  magyar: "hu",
  hungarian: "hu",
  türkçe: "tr",
  turkish: "tr",
  العربية: "ar",
  arabic: "ar",
  עברית: "he",
  hebrew: "he",
  ελληνικά: "el",
  greek: "el",
  "bahasa indonesia": "id",
  indonesian: "id",
  ไทย: "th",
  thai: "th",
  "việt nam": "vi",
  vietnamese: "vi",
  հայերեն: "hy",
  armenian: "hy",
  bosanski: "bs",
  bosnian: "bs",
  български: "bg",
  bulgarian: "bg",
  català: "ca",
  catalan: "ca",
  hrvatski: "hr",
  croatian: "hr",
  esperanto: "eo",
  eesti: "et",
  estonian: "et",
  gaeilge: "ga",
  irish: "ga",
  íslenska: "is",
  icelandic: "is",
  lietuvių: "lt",
  lithuanian: "lt",
  latviešu: "lv",
  latvian: "lv",
  македонски: "mk",
  macedonian: "mk",
  "bahasa melayu": "ms",
  malay: "ms",
  română: "ro",
  romanian: "ro",
  slovenčina: "sk",
  slovak: "sk",
  slovenščina: "sl",
  slovenian: "sl",
  српски: "sr",
  serbian: "sr",
  українська: "uk",
  ukrainian: "uk",
  afrikaans: "af",
  shqip: "sq",
  albanian: "sq",
  euskera: "eu",
  basque: "eu",
  беларуская: "be",
  belarusian: "be",
  বাংলা: "bn",
  bengali: "bn",
  ქართული: "ka",
  georgian: "ka",
  ગુજરાતી: "gu",
  gujarati: "gu",
  हिन्दी: "hi",
  hindi: "hi",
  latin: "la",
  മലയാളം: "ml",
  malayalam: "ml",
  मराठी: "mr",
  marathi: "mr",
  नेपाली: "ne",
  nepali: "ne",
  ਪੰਜਾਬੀ: "pa",
  punjabi: "pa",
  سنڌي: "sd",
  sindhi: "sd",
  සිංහල: "si",
  sinhala: "si",
  தமிழ்: "ta",
  tamil: "ta",
  తెలుగు: "te",
  telugu: "te",
  اردو: "ur",
  urdu: "ur",
  cymraeg: "cy",
  welsh: "cy",
  gaelic: "gd",
  "scottish gaelic": "gd",
  yiddish: "yi",
};

const getText = (el, selector) =>
  el.querySelector(selector)?.textContent.trim() || "";

const getAttr = (el, selector, attr) =>
  el.querySelector(selector)?.getAttribute(attr) || "";

const toNumber = (raw) => parseInt((raw || "").replace(/,/g, ""), 10) || 0;

const toDate = (raw) => {
  const date = new Date(raw);
  return isNaN(date) ? raw : date;
};

export function extractAllValues(work) {
  const link = work.querySelector("h4.heading a[href^='/works/']");

  return {
    id: link?.getAttribute("href")?.match(/\/works\/(\d+)/)?.[1] || "",
    title: link?.textContent.trim() || "",
    language: getAttr(work, "dd.language", "lang"),
    word_count: toNumber(getText(work, "dd.words")),
    chapters: getText(work, "dd.chapters"),
    comments_count: toNumber(getText(work, "dd.comments")),
    kudos_count: toNumber(getText(work, "dd.kudos")),
    bookmarks_count: toNumber(getText(work, "dd.bookmarks")),
    hits: toNumber(getText(work, "dd.hits")),
    revised_at: toDate(getText(work, "p.datetime")),
    authors_to_sort_on: getText(work, 'a[rel="author"]'),
  };
}

export function extractRelevantData(work, filterType) {
  return extractAllValues(work)[filterType] || "";
}

export function isValid(relevantData, extractedData) {
  return extractedData > relevantData;
}

export function workInfo(work) {
  const { id, title, authors_to_sort_on } = extractAllValues(work);
  if (!id) return null;
  return { id, title, author: authors_to_sort_on || "Anonymous" };
}

// ---------- language ----------
export function getLangAbb(lang) {
  const normalized = lang
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");
  if (/^[a-z]{2,3}(-[a-z]{2,3})?$/i.test(normalized)) {
    return normalized;
  }
  if (languageCodeMap[normalized]) {
    return languageCodeMap[normalized];
  }
  console.warn(`Unrecognized language: "${lang}"`);
  return "";
}
