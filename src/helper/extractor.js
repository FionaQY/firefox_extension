import {
  BASE_URL,
  BREAK_MARK,
  escapeHtml,
  stripLabel,
  textOf,
  toInteger,
} from "./commons.js";

export const WORK_BLURB_SELECTOR = ".work.blurb.group";

const WORK_SELECTORS = {
  title: "h2.title.heading",
  author: "h3.byline.heading",
  tagSummary: "div.summary.module",
  summary: ".preface .summary",
  startNotes: ".preface .notes.module",
  endNotes: "#work_endnotes, div.work.notes.module",
  root: "#workskin",
};

const CHAPTER_SELECTORS = {
  container: "#chapters",
  items: "#chapters > .chapter",
  heading: "h3.title, h3.heading, .title.heading",
  body: ".userstuff:not(.summary .userstuff):not(.notes .userstuff)",
  singleBody: "#workskin div.userstuff, #chapters div.userstuff",
  owner: ".chapter, div[id^='chapter-']",
};

const CONTENT_SELECTORS = {
  blockquote: "blockquote.userstuff",
  div: "div.userstuff",
  removable:
    "h3, .heading, .title, .jump, a[href^='#chapter_'], a[href^='#work_']",
  lineBreak: "br",
  lists: "ol, ul",
  textBlocks: "p, blockquote",
  paragraph: "p",
};

const NOTE_SELECTORS = {
  summary: ".summary",
  any: ".notes, .end.notes",
  summaryOrNotes: ".summary, .notes",
};

const BLURB_SELECTORS = {
  workLink: "h4.heading a[href^='/works/']",
  language: "dd.language",
  publishedOrUpdatedDate: "p.datetime",
  author: 'a[rel="author"]',
};

const SERIES_SELECTORS = {
  title: "h2.heading",
  metaLabels: "dl.series.meta dt",
  authors: 'dl.series.meta a[rel="author"]',
};

const TAG_SELECTORS = {
  work: {
    rating: "dd.rating a",
    warning: "dd.warning a",
    category: "dd.category a",
    fandom: "dd.fandom a",
    relationship: "dd.relationship a",
    character: "dd.character a",
    freeform: "dd.freeform a",
    series: "dd.series a",
    collections: "dd.collections a",
  },
  series: {
    rating: "li.ratings a",
    warning: "li.warnings a",
    category: "li.categories a",
    fandom: "li.fandoms a",
    relationship: "li.relationships a",
    character: "li.characters a",
    freeform: "li.freeforms a",
    series: "li.series a",
    collections: "li.collections a",
  },
};

const LABELS = {
  SUMMARY: "Summary:",
  NOTES: "Notes:",
  SERIES_CREATOR: "creator",
  SERIES_DESCRIPTION: "description",
  DEFAULT_AUTHOR: "Anonymous",
  UNTITLED_WORK: "untitled",
  UNKNOWN_AUTHOR: "unknown",
};

const STAT_FIELDS = [
  { label: "Published", selector: "dd.published" },
  { label: "Updated", selector: "dd.status" },
  { label: "Words", selector: "dd.words" },
  { label: "Chapters", selector: "dd.chapters" },
  { label: "Comments", selector: "dd.comments" },
  { label: "Kudos", selector: "dd.kudos" },
  { label: "Bookmarks", selector: "dd.bookmarks" },
  { label: "Hits", selector: "dd.hits" },
];

const CHAPTER_NUMBER_PREFIX = /^Chapter\s+\d+\s*:?\s*/i;
const AO3_NOTES_PLACEHOLDER = /\(See the end of the (?:chapter|work)\b/i;

const makeLink = (url, text) =>
  `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`;

const buildHeading = (url, title, author) =>
  `${makeLink(url, title)} by ${escapeHtml(author)}`;

function extractTags(root, needHref = false, isSeries = false) {
  const tags = {};
  const selectors = isSeries ? TAG_SELECTORS.series : TAG_SELECTORS.work;

  for (const category of Object.keys(selectors)) {
    const anchors = root.querySelectorAll(selectors[category]);
    if (anchors.length === 0) continue;

    tags[category] = Array.from(
      new Map(
        Array.from(anchors, (anchor) => {
          const text = textOf(anchor);
          if (!needHref) return [text, text];
          const url = new URL(anchor.getAttribute("href") || "", BASE_URL).href;
          return [text, makeLink(url, text)];
        }),
      ).values(),
    );
  }
  return tags;
}

export function getWorkInfo(doc, url, needHref) {
  return {
    heading: buildHeading(
      url,
      textOf(doc.querySelector(WORK_SELECTORS.title)),
      textOf(doc.querySelector(WORK_SELECTORS.author)),
    ),
    summary: textOf(doc.querySelector(WORK_SELECTORS.tagSummary)),
    tags: extractTags(doc, needHref),
  };
}

function seriesMeta(doc, label) {
  const dt = [...doc.querySelectorAll(SERIES_SELECTORS.metaLabels)].find((el) =>
    el.textContent.trim().toLowerCase().startsWith(label),
  );
  return dt?.nextElementSibling ?? null;
}

export function getSeriesInfo(doc, url, needHref) {
  const title = textOf(doc.querySelector(SERIES_SELECTORS.title));
  if (!title) return null;

  const authors = [
    ...new Set(
      [...doc.querySelectorAll(SERIES_SELECTORS.authors)]
        .map((anchor) => textOf(anchor))
        .filter(Boolean),
    ),
  ];
  const author =
    authors.join(", ") ||
    textOf(seriesMeta(doc, LABELS.SERIES_CREATOR)) ||
    LABELS.DEFAULT_AUTHOR;
  return {
    heading: buildHeading(url, title, author),
    summary: textOf(seriesMeta(doc, LABELS.SERIES_DESCRIPTION)),
    tags: extractTags(doc, needHref, true),
    author,
  };
}

export function extractWorkSummary(doc, url, needHref = true) {
  if (!doc.querySelector(WORK_SELECTORS.title)) return null;
  return getWorkInfo(doc, url, needHref);
}

// Convert an AO3 content block to readable plain text.
function getContentText(container) {
  if (!container) return "";

  const target =
    container.querySelector(CONTENT_SELECTORS.blockquote) ||
    container.querySelector(CONTENT_SELECTORS.div) ||
    container;
  const cloned = target.cloneNode(true);

  cloned
    .querySelectorAll(CONTENT_SELECTORS.removable)
    .forEach((element) => element.remove());

  // Line breaks become markers; textOf() turns them into "\n" at the end.
  cloned
    .querySelectorAll(CONTENT_SELECTORS.lineBreak)
    .forEach((lineBreak) => lineBreak.replaceWith(BREAK_MARK));

  cloned.querySelectorAll(CONTENT_SELECTORS.lists).forEach((list) => {
    const isOrdered = list.tagName.toLowerCase() === "ol";

    Array.from(list.children)
      .filter((element) => element.tagName.toLowerCase() === "li")
      .forEach((item, index) => {
        const prefix = isOrdered ? `${index + 1}. ` : "- ";
        const paragraph = cloned.ownerDocument.createElement("p");

        // Links/images inside the item are flattened to text
        paragraph.textContent = `${prefix}${textOf(item, true).replace(/\n/g, BREAK_MARK)}`;
        list.parentNode?.insertBefore(paragraph, list);
      });

    list.remove();
  });

  const paragraphs = Array.from(
    cloned.querySelectorAll(CONTENT_SELECTORS.textBlocks),
  )
    .map((block) => textOf(block, true))
    .filter(Boolean);

  return paragraphs.length
    ? paragraphs.join("\n\n").trim()
    : textOf(cloned, true);
}

// Extract summary text without its leading label.
function getSummaryText(container) {
  return stripLabel(
    removeAO3NotesPlaceholders(getContentText(container)),
    LABELS.SUMMARY,
  );
}

// Extract notes text without its leading label.
function getNotesText(container) {
  return stripLabel(
    removeAO3NotesPlaceholders(getContentText(container)),
    LABELS.NOTES,
  );
}

function removeAO3NotesPlaceholders(value) {
  return String(value || "")
    .split(/\n+/)
    .filter((paragraph) => !AO3_NOTES_PLACEHOLDER.test(paragraph))
    .join("\n\n")
    .trim();
}

// Collect story paragraphs while excluding summaries and notes.
function getStoryParagraphs(userstuff) {
  if (!userstuff) return [];

  return Array.from(userstuff.querySelectorAll(CONTENT_SELECTORS.paragraph))
    .filter((paragraph) => !paragraph.closest(NOTE_SELECTORS.summaryOrNotes))
    .map((paragraph) => textOf(paragraph, true))
    .filter(Boolean);
}

// Read the configured work statistics from a document or work blurb.
function extractStats(root) {
  return Object.fromEntries(
    STAT_FIELDS.map(({ label, selector }) => [
      label,
      textOf(root.querySelector(selector)),
    ]),
  );
}

// Collect summaries and notes that belong to a chapter.
function collectChapterNotes(root, workEndNotesElement, checkOwnership) {
  const notes = [];
  const summaryElement = root.querySelector(NOTE_SELECTORS.summary);

  if (summaryElement) {
    const summary = getSummaryText(summaryElement);
    if (summary) notes.push(`Summary: ${summary}`);
  }

  root.querySelectorAll(NOTE_SELECTORS.any).forEach((notesElement) => {
    if (
      workEndNotesElement &&
      (workEndNotesElement === notesElement ||
        workEndNotesElement.contains(notesElement))
    ) {
      return;
    }

    if (notesElement.classList.contains("summary")) return;

    if (checkOwnership) {
      const parentChapter = notesElement.closest(CHAPTER_SELECTORS.owner);

      if (
        parentChapter &&
        parentChapter !== root &&
        !root.contains(notesElement)
      ) {
        return;
      }
    }

    const text = getNotesText(notesElement);
    if (text && !notes.includes(text)) notes.push(text);
  });

  return notes;
}

// Extract structured metadata, chapters, and notes from a work page.
export function extractWorkData(doc, href) {
  const tagData = getWorkInfo(doc, href, false);
  const summary = getSummaryText(doc.querySelector(WORK_SELECTORS.summary));
  const title =
    textOf(doc.querySelector(WORK_SELECTORS.title)) || LABELS.UNTITLED_WORK;
  const author =
    textOf(doc.querySelector(WORK_SELECTORS.author)) || LABELS.UNKNOWN_AUTHOR;
  const stats = extractStats(doc);

  const workStartNotes = getNotesText(
    doc.querySelector(WORK_SELECTORS.startNotes),
  );
  const workEndNotesElement = doc.querySelector(WORK_SELECTORS.endNotes);
  const workEndNotes = getNotesText(workEndNotesElement);
  const chapterElements = doc.querySelectorAll(CHAPTER_SELECTORS.items);
  let chapters;

  if (chapterElements.length > 0) {
    chapters = Array.from(chapterElements, (chapterElement) => {
      const headingElement = chapterElement.querySelector(
        CHAPTER_SELECTORS.heading,
      );
      const heading = (headingElement ? textOf(headingElement) : "")
        .replace(CHAPTER_NUMBER_PREFIX, "")
        .trim();

      return {
        heading,
        lines: getStoryParagraphs(
          chapterElement.querySelector(CHAPTER_SELECTORS.body),
        ),
        notes: collectChapterNotes(chapterElement, workEndNotesElement, true),
      };
    });
  } else {
    const chapterRoot =
      doc.querySelector(CHAPTER_SELECTORS.container) ||
      doc.querySelector(WORK_SELECTORS.root) ||
      doc;

    chapters = [
      {
        heading: title,
        lines: getStoryParagraphs(
          doc.querySelector(CHAPTER_SELECTORS.singleBody),
        ),
        notes: collectChapterNotes(chapterRoot, workEndNotesElement, false),
      },
    ];
  }

  return {
    title,
    author,
    url: href,
    tags: tagData.tags,
    summary: tagData.summary,
    summaryText: summary,
    stats,
    chapters,
    workStartNotes,
    workEndNotes,
  };
}

const getText = (el, selector) => textOf(el.querySelector(selector));

const getAttr = (el, selector, attr) =>
  el.querySelector(selector)?.getAttribute(attr) || "";

const toDate = (raw) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date;
};

export function extractAllValues(work) {
  const link = work.querySelector(BLURB_SELECTORS.workLink);
  const stats = extractStats(work);

  return {
    id: link?.getAttribute("href")?.match(/\/works\/(\d+)/)?.[1] || "",
    title: textOf(link),
    language: getAttr(work, BLURB_SELECTORS.language, "lang"),
    word_count: toInteger(stats.Words),
    chapters: stats.Chapters,
    comments_count: toInteger(stats.Comments),
    kudos_count: toInteger(stats.Kudos),
    bookmarks_count: toInteger(stats.Bookmarks),
    hits: toInteger(stats.Hits),
    revised_at: toDate(getText(work, BLURB_SELECTORS.publishedOrUpdatedDate)),
    authors_to_sort_on: getText(work, BLURB_SELECTORS.author),
  };
}

// Return one selected metadata value for filtering.
export const extractRelevantData = (work, filterType) =>
  extractAllValues(work)[filterType] || "";

// Check whether the extracted value exceeds the requested threshold.
export const isValid = (relevantData, extractedData) =>
  extractedData > relevantData;

// Extract the basic identity fields used by the download list.
export function workInfo(work) {
  const { id, title, authors_to_sort_on } = extractAllValues(work);
  if (!id) return null;
  return {
    id,
    title,
    author: authors_to_sort_on || LABELS.DEFAULT_AUTHOR,
  };
}

// ---------- language ----------

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

// Convert an AO3 language name or code to a language abbreviation.
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
