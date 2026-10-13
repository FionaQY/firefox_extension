import { createNotifPopup } from "./popup.js";

function getTagsHelper(doc, query) {
  return doc.querySelector(query)?.innerText || "";
}

export function getTags(doc, url, needHref) {
  const TAGCATEGORIES = [
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

  const summary = getTagsHelper(doc, "div.summary.module");
  const tags = {};
  for (const cat of TAGCATEGORIES) {
    const links = [...doc.querySelectorAll(`dd.${cat} a`)].map((x) =>
      !needHref
        ? x.innerText.trim()
        : `<a href="${x.href}">${x.innerText.trim()}</a>`,
    );
    if (links.length > 0) {
      tags[cat] = links;
    }
  }

  const title = `<a href="${url}">${getTagsHelper(doc, "h2.title.heading")}</a>`;
  const author = getTagsHelper(doc, "h3.byline.heading");
  const heading = `${title} by ${author}`;
  return { heading, summary, tags };
}

export async function fetchDoc(url) {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 429) throw new Error("Rate limited by AO3 (429)");
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return new DOMParser().parseFromString(await res.text(), "text/html");
}

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

export async function getSummaryFromWork(currentUrl, url, needHref) {
  if (currentUrl == url) {
    return getTagsHelper(document, "h2.title.heading")
      ? getTags(document, url, needHref)
      : null;
  }
  try {
    return getTags(await fetchDoc(url), url, needHref);
  } catch (err) {
    createNotifPopup("Error loading work:", err);
    return null;
  }
}

export async function getSummary(currentUrl, url, needHref = true) {
  console.log(`Getting summary from ${url}...`);

  const data = await getSummaryFromWork(currentUrl, url, needHref);
  if (!data) {
    createNotifPopup("Failed to load summary.");
    return null;
  }
  return data;
}

export function getWorkUrl(url, withChapter = true) {
  const match = url.match(/\/works\/(\d+)\/chapters\/(\d+)/);
  if (match) {
    const workId = match[1];
    const chapterId = match[2];
    let link = `https://archiveofourown.org/works/${workId}`;
    if (chapterId && withChapter) {
      link += `/chapters/${chapterId}`;
    }
    return link;
  }
  const match2 = url.match(/\/works\/(\d+)/);
  if (match2) {
    return `https://archiveofourown.org/works/${match2[1]}`;
  }
  return "";
}
