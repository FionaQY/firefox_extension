import { getTags, stripLabel, toInteger } from "./commons.js";

const WORK_SELECTORS = {
  title: "h2.title.heading",
  author: "h3.byline.heading",
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

const BREAK_MARK = "\uE000";

function textOf(element, rich = false) {
  if (!element) return "";

  const clone = element.cloneNode(true);

  if (rich) {
    // Images -> text placeholder.
    clone.querySelectorAll("img").forEach((img) => {
      const alt = (img.getAttribute("alt") || "").trim();
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      const label = [alt, src].filter(Boolean).join(": ");

      img.replaceWith(` [Image${label ? `: ${label}` : ""}] `);
    });

    // Links
    clone.querySelectorAll("a[href]").forEach((link) => {
      const href = (link.getAttribute("href") || "").trim();

      if (
        !href ||
        href.startsWith("#") ||
        /^(mailto|javascript):/i.test(href)
      ) {
        return;
      }

      const url = href.startsWith("/")
        ? `https://archiveofourown.org${href}`
        : href;

      const text = link.textContent.trim();

      if (text.replace(/\/$/, "") === url.replace(/\/$/, "")) return;

      link.after(` (${url})`);
    });
  }

  clone
    .querySelectorAll(CONTENT_SELECTORS.lineBreak)
    .forEach((lineBreak) => lineBreak.replaceWith(BREAK_MARK));

  return clone.textContent
    .replace(/\s+/g, " ")
    .split(BREAK_MARK)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
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
  return stripLabel(getContentText(container), "Summary:");
}

// Extract notes text without its leading label.
function getNotesText(container) {
  return stripLabel(getContentText(container), "Notes:");
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
  const tagData = getTags(doc, href, false);
  const summary = getSummaryText(doc.querySelector(WORK_SELECTORS.summary));
  const title = textOf(doc.querySelector(WORK_SELECTORS.title)) || "untitled";
  const author = textOf(doc.querySelector(WORK_SELECTORS.author)) || "unknown";
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

// Read trimmed text from a selected descendant.
const getText = (el, selector) => textOf(el.querySelector(selector));

// Read an attribute from a selected descendant.
const getAttr = (el, selector, attr) =>
  el.querySelector(selector)?.getAttribute(attr) || "";

// Parse a date string, preserving the original text when it is invalid.
const toDate = (raw) => {
  const date = new Date(raw);
  return isNaN(date) ? raw : date;
};

// Extract filterable metadata from a work listing blurb.
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
  return { id, title, author: authors_to_sort_on || "Anonymous" };
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
