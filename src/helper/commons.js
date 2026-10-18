import { createNotifPopup } from "./popup.js";

export function textOf(element) {
  return (element?.innerText ?? element?.textContent ?? "").trim();
}

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sameText(left, right) {
  return normalizeText(left) === normalizeText(right);
}

export function stripLabel(value, label) {
  if (!value) return "";
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(`^(?:\\s*${escaped}\\s*)+`, "i"), "").trim();
}

export function toInteger(value) {
  return parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10) || 0;
}

export function safeFilename(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
}

export const BASE_URL = "https://archiveofourown.org";

export function getWorkUrl(url, withChapter = true) {
  const match = url.match(/\/works\/(\d+)(?:\/chapters\/(\d+))?/);
  if (!match) return "";

  const [, workId, chapterId] = match;
  const base = `${BASE_URL}/works/${workId}`;
  return chapterId && withChapter ? `${base}/chapters/${chapterId}` : base;
}

// ---------- loading pages ----------

export async function fetchDoc(url, timeout = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });
    if (res.status === 429) throw new Error("Rate limited by AO3 (429)");
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return new DOMParser().parseFromString(await res.text(), "text/html");
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out loading ${url} after ${timeout}ms`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Loads `url` in a hidden iframe, resolves with `parse(contentDocument)`. */
export function loadInIframe(url, parse, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.classList.add("ao3-offscreen-iframe");

    let timer = null;
    const cleanup = () => {
      clearTimeout(timer);
      iframe.remove();
    };

    iframe.onload = async () => {
      try {
        resolve(await parse(iframe.contentDocument));
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load ${url}`));
    };

    if (timeout > 0) {
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out loading ${url}`));
      }, timeout);
    }

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}

// ---------- tags & summary ----------

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

const innerText = (root, selector) =>
  root.querySelector(selector)?.innerText || "";

function extractTags(doc, needHref) {
  const tags = {};
  for (const cat of TAG_CATEGORIES) {
    const links = [...doc.querySelectorAll(`dd.${cat} a`)].map((a) => {
      const text = a.innerText.trim();
      return needHref ? `<a href="${a.href}">${text}</a>` : text;
    });
    if (links.length > 0) tags[cat] = links;
  }
  return tags;
}

export function getTags(doc, url, needHref) {
  const title = `<a href="${url}">${innerText(doc, "h2.title.heading")}</a>`;
  const author = innerText(doc, "h3.byline.heading");

  return {
    heading: `${title} by ${author}`,
    summary: innerText(doc, "div.summary.module"),
    tags: extractTags(doc, needHref),
  };
}

export async function getSummaryFromWork(currentUrl, url, needHref) {
  if (currentUrl === url) {
    return innerText(document, "h2.title.heading")
      ? getTags(document, url, needHref)
      : null;
  }

  return getTags(await fetchDoc(url), url, needHref);
}

export async function getSummary(currentUrl, url, needHref = true) {
  console.log(`Getting summary from ${url}...`);

  try {
    const data = await getSummaryFromWork(currentUrl, url, needHref);
    if (!data) {
      createNotifPopup("Failed to load summary.", 0);
      return null;
    }
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    createNotifPopup(`Error loading work: ${message}`, 0);
    return null;
  }
}
