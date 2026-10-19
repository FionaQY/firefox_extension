import { createNotifPopup } from "./popup.js";

export const BASE_URL = "https://archiveofourown.org";

export const BREAK_MARK = "\uE000";

const DEFAULT_TIMEOUT_MS = 60_000;
const HTTP_RATE_LIMITED = 429;
const DEFAULT_SERIES_AUTHOR = "Anonymous";
const IFRAME_CLASS = "ao3-offscreen-iframe";

const RE = {
  WORK_PATH: /\/works\/(\d+)(?:\/chapters\/(\d+))?/,
  SERIES_PATH: /\/series\/(\d+)/,
  WHITESPACE: /\s+/g,
  NON_DIGITS: /[^\d]/g,
  INVALID_FILENAME_CHARS: /[\\/:*?"<>|]/g,
  REGEX_SPECIAL_CHARS: /[.*+?^${}()|[\]\\]/g,
  TRAILING_SLASH: /\/$/,
  NON_NAVIGABLE_HREF: /^(mailto|javascript):/i,
};

const SEL = {
  WORK_TITLE: "h2.title.heading",
  WORK_BYLINE: "h3.byline.heading",
  WORK_SUMMARY: "div.summary.module",
  SERIES_TITLE: "h2.heading",
  SERIES_META_LABELS: "dl.series.meta dt",
  SERIES_AUTHORS: 'dl.series.meta a[rel="author"]',
};

const SERIES_LABEL = {
  CREATOR: "creator",
  DESCRIPTION: "description",
};

const TAG_CATEGORIES = [
  "rating",
  "warning",
  "category",
  "fandom",
  "relationship",
  "character",
  "freeform",
  "series",
  "collections",
];

const tagLinkSelector = (category) => `dd.${category} a`;

const MSG = {
  SUMMARY_FAILED: "Failed to load summary.",
  SUMMARY_ERROR: (reason) => `Error loading work: ${reason}`,
  RATE_LIMITED: "Rate limited by AO3 (429)",
  TIMED_OUT: (url, ms) => `Timed out loading ${url} after ${ms}ms`,
  IFRAME_FAILED: (url) => `Failed to load ${url}`,
};

/* ==========================================================================
 * ERRORS
 * ========================================================================== */
export class HttpError extends Error {
  constructor(message, status, options) {
    super(message, options);
    this.name = "HttpError";
    this.status = status;
  }

  get isRateLimited() {
    return this.status === HTTP_RATE_LIMITED;
  }
}

/* ==========================================================================
 * TEXT HELPERS
 * ========================================================================== */
const collapseWhitespace = (value) => value.replace(RE.WHITESPACE, " ");

const stripTrailingSlash = (url) => url.replace(RE.TRAILING_SLASH, "");

const escapeRegExp = (value) => value.replace(RE.REGEX_SPECIAL_CHARS, "\\$&");

// Resolves relative AO3 paths against BASE_URL; absolute URLs pass through.
const toAbsoluteUrl = (href) => new URL(href, BASE_URL).href;

// In-page anchors, mailto/javascript links and empty hrefs aren't worth printing.
const isNavigableHref = (href) =>
  Boolean(href) && !href.startsWith("#") && !RE.NON_NAVIGABLE_HREF.test(href);

function replaceImagesWithPlaceholders(root) {
  for (const img of root.querySelectorAll("img")) {
    const alt = (img.getAttribute("alt") || "").trim();
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    const label = [alt, src].filter(Boolean).join(": ");

    img.replaceWith(` [Image${label ? `: ${label}` : ""}] `);
  }
}

// Links keep their text and get the URL appended.
function appendLinkUrls(root) {
  for (const anchor of root.querySelectorAll("a[href]")) {
    const href = (anchor.getAttribute("href") || "").trim();
    if (!isNavigableHref(href)) continue;

    const url = toAbsoluteUrl(href);
    const text = anchor.textContent.trim();

    // If the visible text already is the URL, don't repeat it.
    if (stripTrailingSlash(text) === stripTrailingSlash(url)) continue;

    anchor.after(` (${url})`);
  }
}

export function textOf(element, rich = false) {
  if (!element) return "";

  const clone = element.cloneNode(true);

  if (rich) {
    replaceImagesWithPlaceholders(clone);
    appendLinkUrls(clone);
  }

  clone
    .querySelectorAll("br")
    .forEach((lineBreak) => lineBreak.replaceWith(BREAK_MARK));

  return collapseWhitespace(clone.textContent)
    .split(BREAK_MARK)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

export function normalizeText(value) {
  return collapseWhitespace(String(value ?? ""))
    .trim()
    .toLowerCase();
}

export function sameText(left, right) {
  return normalizeText(left) === normalizeText(right);
}

export function stripLabel(value, label) {
  if (!value) return "";
  const repeatedLabel = new RegExp(`^(?:\\s*${escapeRegExp(label)}\\s*)+`, "i");
  return value.replace(repeatedLabel, "").trim();
}

export function toInteger(value) {
  return parseInt(String(value ?? "").replace(RE.NON_DIGITS, ""), 10) || 0;
}

export function safeFilename(value) {
  return String(value ?? "")
    .replace(RE.INVALID_FILENAME_CHARS, "_")
    .trim();
}

/* ==========================================================================
 * HTML HELPERS
 * ========================================================================== */
const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// Escaped <a> tag.
const link = (url, text) =>
  `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`;

// "<a>Title</a> by Author" as an HTML string.
const buildHeading = (url, title, author) =>
  `${link(url, title)} by ${escapeHtml(author)}`;

/* ==========================================================================
 * URLS & LOADING PAGES
 * ========================================================================== */
export function getWorkUrl(url, withChapter = true) {
  const match = url.match(RE.WORK_PATH);
  if (!match) return "";

  const [, workId, chapterId] = match;
  const base = `${BASE_URL}/works/${workId}`;
  return chapterId && withChapter ? `${base}/chapters/${chapterId}` : base;
}

export function getSeriesUrl(url) {
  const match = url.match(RE.SERIES_PATH);
  return match ? `${BASE_URL}/series/${match[1]}` : "";
}

export async function fetchDoc(url, timeout = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });

    if (res.status === HTTP_RATE_LIMITED) {
      throw new HttpError(MSG.RATE_LIMITED, res.status);
    }
    if (!res.ok) {
      throw new HttpError(`${url}: ${res.status}`, res.status);
    }

    return new DOMParser().parseFromString(await res.text(), "text/html");
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(MSG.TIMED_OUT(url, timeout), { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Loads `url` in a hidden iframe, resolves with `parse(contentDocument)`. */
export function loadInIframe(url, parse, timeout = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.classList.add(IFRAME_CLASS);

    let timer = null;
    const cleanup = () => {
      clearTimeout(timer);
      iframe.remove();
    };
    const fail = (error) => {
      cleanup();
      reject(error);
    };

    iframe.onload = async () => {
      try {
        resolve(await parse(iframe.contentDocument));
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };
    iframe.onerror = () => fail(new Error(MSG.IFRAME_FAILED(url)));

    if (timeout > 0) {
      timer = setTimeout(
        () => fail(new Error(MSG.TIMED_OUT(url, timeout))),
        timeout,
      );
    }

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}

/* ==========================================================================
 * TAGS & SUMMARY
 * ========================================================================== */
function extractTags(doc, needHref) {
  const tags = {};

  for (const category of TAG_CATEGORIES) {
    const anchors = [...doc.querySelectorAll(tagLinkSelector(category))];
    if (!anchors.length) continue;

    tags[category] = anchors.map((anchor) =>
      needHref
        ? link(toAbsoluteUrl(anchor.getAttribute("href") || ""), textOf(anchor))
        : textOf(anchor),
    );
  }

  return tags;
}

export function getTags(doc, url, needHref) {
  return {
    heading: buildHeading(
      url,
      textOf(doc.querySelector(SEL.WORK_TITLE)),
      textOf(doc.querySelector(SEL.WORK_BYLINE)),
    ),
    summary: textOf(doc.querySelector(SEL.WORK_SUMMARY)),
    tags: extractTags(doc, needHref),
  };
}

// The <dd> that follows a <dt> whose label starts with `label`.
function seriesMeta(doc, label) {
  const dt = [...doc.querySelectorAll(SEL.SERIES_META_LABELS)].find((el) =>
    el.textContent.trim().toLowerCase().startsWith(label),
  );
  return dt?.nextElementSibling ?? null;
}

export function getSeriesInfo(doc, url) {
  const title = textOf(doc.querySelector(SEL.SERIES_TITLE));
  if (!title) return null;

  const authors = [
    ...new Set(
      [...doc.querySelectorAll(SEL.SERIES_AUTHORS)]
        .map((anchor) => textOf(anchor))
        .filter(Boolean),
    ),
  ];
  const author =
    authors.join(", ") ||
    textOf(seriesMeta(doc, SERIES_LABEL.CREATOR)) ||
    DEFAULT_SERIES_AUTHOR;

  return {
    heading: buildHeading(url, title, author),
    summary: textOf(seriesMeta(doc, SERIES_LABEL.DESCRIPTION)),
    tags: [],
    author,
  };
}

// Reads from the live page when we're already on `url`, otherwise fetches it.
async function summaryFrom(currentUrl, url, readySelector, parse) {
  if (currentUrl === url) {
    return document.querySelector(readySelector) ? parse(document) : null;
  }
  return parse(await fetchDoc(url));
}

export const getSummaryFromWork = (currentUrl, url, needHref) =>
  summaryFrom(currentUrl, url, SEL.WORK_TITLE, (doc) =>
    getTags(doc, url, needHref),
  );

export const getSummaryFromSeries = (currentUrl, url) =>
  summaryFrom(currentUrl, url, SEL.SERIES_TITLE, (doc) =>
    getSeriesInfo(doc, url),
  );

export async function getSummary(currentUrl, url, needHref = true) {
  console.log(`Getting summary from ${url}...`);

  try {
    const data = await getSummaryFromWork(currentUrl, url, needHref);
    if (!data) {
      createNotifPopup(MSG.SUMMARY_FAILED, 0);
      return null;
    }
    return data;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    createNotifPopup(MSG.SUMMARY_ERROR(reason), 0);
    return null;
  }
}
