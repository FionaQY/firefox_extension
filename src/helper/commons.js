export const BASE_URL = "https://archiveofourown.org";

export const BREAK_MARK = "\uE000";

const DEFAULT_TIMEOUT_MS = 60_000;
const HTTP_RATE_LIMITED = 429;
const IFRAME_CLASS = "ao3-offscreen-iframe";

const SELECTORS = {
  IMAGE: "img",
  LINK_WITH_HREF: "a[href]",
  LINE_BREAK: "br",
};

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

const MSG = {
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
  for (const img of root.querySelectorAll(SELECTORS.IMAGE)) {
    const alt = (img.getAttribute("alt") || "").trim();
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    const label = [alt, src].filter(Boolean).join(": ");

    img.replaceWith(` [Image${label ? `: ${label}` : ""}] `);
  }
}

// Links keep their text and get the URL appended.
function appendLinkUrls(root) {
  for (const anchor of root.querySelectorAll(SELECTORS.LINK_WITH_HREF)) {
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
    .querySelectorAll(SELECTORS.LINE_BREAK)
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
