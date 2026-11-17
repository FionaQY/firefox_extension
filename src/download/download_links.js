/* globals browser */
import { createNotifPopup } from "../ui/popup";
import { getBundleIds } from "../storage/bundles";
import { el, button, checkboxField } from "./download_dom";
import { BASE_URL } from "../ao3/page";

export const LINK_TYPES = {
  WORK: "work",
  SERIES: "series",
  LISTING: "listing",
};

const WORK = /^(?:\/collections\/[^/]+)?\/works\/(\d+)(?:\/|$)/;
const SERIES = /^\/series\/(\d+)\/?$/;
const LISTINGS = [
  /^\/users\/[^/]+\/(?:pseuds\/[^/]+\/)?(?:works|bookmarks|series)\/?$/,
  /^\/tags\/[^/]+\/(?:works|bookmarks)\/?$/,
  /^\/collections\/[^/]+\/(?:works|bookmarks|series)\/?$/,
  /^\/works\/search\/?$/,
  /^\/bookmarks\/search\/?$/,
];
// Bare /works and /bookmarks are only listings when filtered.
const FILTERED_LISTINGS = [/^\/works\/?$/, /^\/bookmarks\/?$/];

const MAX_LINKS = 50;
const TYPE_LABELS = {
  [LINK_TYPES.WORK]: "Work",
  [LINK_TYPES.SERIES]: "Series",
  [LINK_TYPES.LISTING]: "Listing (all pages, or the limit below)",
};

function readable(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/**
 * Classify one pasted link.
 * Returns null for empty input, { error } for unusable input,
 * or { type, id?, href, label }.
 */
export function parseLink(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`,
    );
  } catch {
    return { error: "Not a valid link" };
  }
  if (!/(^|\.)archiveofourown\.org$/i.test(url.hostname)) {
    return { error: "Not an AO3 link" };
  }

  const { pathname, search } = url;

  const work = pathname.match(WORK);
  if (work) {
    return { type: LINK_TYPES.WORK, id: work[1], label: `Work ${work[1]}` };
  }

  const series = pathname.match(SERIES);
  if (series) {
    return {
      type: LINK_TYPES.SERIES,
      id: series[1],
      label: `Series ${series[1]}`,
    };
  }

  const isListing =
    LISTINGS.some((re) => re.test(pathname)) ||
    (search && FILTERED_LISTINGS.some((re) => re.test(pathname)));
  if (isListing) {
    // Rebuild on the canonical origin and drop the #fragment.
    const href = new URL(pathname + search, BASE_URL).href;
    return { type: LINK_TYPES.LISTING, href, label: readable(pathname) };
  }

  return { error: "Unsupported AO3 page" };
}

function describeItems(items) {
  if (items.length === 1) {
    const [item] = items;
    return `${item.type === LINK_TYPES.SERIES ? "Series" : "Work"} ${item.id}`;
  }
  const series = items.filter((i) => i.type === LINK_TYPES.SERIES).length;
  const works = items.length - series;
  const parts = [works && `${works} works`, series && `${series} series`];
  return `Links: ${parts.filter(Boolean).join(", ")}`;
}

export function buildLinksView({ isMobile, switchTab }) {
  const inputClass = `ao3-field-input${isMobile ? " mobile" : ""}`;
  const links = [""];
  const list = el("div");

  function updateBadge(badge, value) {
    const parsed = parseLink(value);
    badge.className = "ao3-link-badge";
    if (!parsed) {
      badge.textContent = "";
    } else if (parsed.error) {
      badge.textContent = parsed.error;
      badge.classList.add("invalid");
    } else {
      badge.textContent = TYPE_LABELS[parsed.type];
      badge.classList.add(parsed.type);
    }
  }

  function buildRow(value, index) {
    const row = el("div", "ao3-link-row");

    const input = el("input", `${inputClass} ao3-link-input`);
    input.type = "text";
    input.placeholder = "https://archiveofourown.org/...";
    input.value = value;

    const badge = el("span");
    updateBadge(badge, value);

    input.addEventListener("input", () => {
      links[index] = input.value;
      updateBadge(badge, input.value);
    });

    input.addEventListener("paste", (event) => {
      const parts = (event.clipboardData?.getData("text") || "")
        .split(/\s+/)
        .filter(Boolean);
      if (parts.length < 2) return;
      event.preventDefault();
      if (links[index].trim()) links.splice(index + 1, 0, ...parts);
      else links.splice(index, 1, ...parts);
      links.length = Math.min(links.length, MAX_LINKS);
      renderRows();
    });

    const remove = button(
      "✕",
      () => {
        links.splice(index, 1);
        if (!links.length) links.push("");
        renderRows();
      },
      "ao3-folder-button",
    );
    remove.title = "Remove link";

    row.append(input, remove, badge);
    return row;
  }

  function renderRows(focusLast = false) {
    list.replaceChildren();
    links.forEach((value, index) => list.append(buildRow(value, index)));
    if (focusLast)
      list.querySelector(".ao3-link-row:last-child input")?.focus();
  }

  const element = el("div", "ao3-links-content");

  const hint = el(
    "div",
    "ao3-links-hint",
    "Paste work, series, author, bookmark or tag links. " +
      "Listing links are crawled page by page.",
  );

  const addButton = button(
    "＋ Add link",
    () => {
      if (links.length >= MAX_LINKS) {
        createNotifPopup(`Up to ${MAX_LINKS} links at a time.`);
        return;
      }
      links.push("");
      renderRows(true);
    },
    "ao3-links-add",
  );

  const bundle = checkboxField("Bundle works");
  const notSeries = checkboxField("Skip works that are in a series");
  const groupSeries = checkboxField(
    "Group series (one ZIP per series, for listing links)",
  );

  const pagesField = el("label", "ao3-field-container");
  pagesField.append(
    el("span", "ao3-field-label", "Pages per listing link (blank = 50)"),
  );
  const pages = el("input", inputClass);
  pages.type = "number";
  pages.min = "1";
  pages.step = "1";
  pages.placeholder = "50";
  pagesField.append(pages);

  async function submit() {
    const entries = new Map();
    for (const [i, value] of links.entries()) {
      const parsed = parseLink(value);
      if (!parsed) continue;
      if (parsed.error) {
        createNotifPopup(`Link #${i + 1}: ${parsed.error}`);
        return;
      }
      entries.set(`${parsed.type}:${parsed.id ?? parsed.href}`, parsed);
    }
    if (!entries.size) {
      createNotifPopup("Add at least one AO3 link.");
      return;
    }

    const limit = Math.floor(Number(pages.value));
    const maxPages = limit >= 1 ? limit : 50;
    const options = {
      bundle: bundle.input.checked,
      notInSeries: notSeries.input.checked,
      groupSeries: groupSeries.input.checked,
    };

    const savedBundle = await getBundleIds();
    const items = [];
    const listings = [];
    for (const entry of entries.values()) {
      if (entry.type === LINK_TYPES.WORK) {
        items.push({
          type: LINK_TYPES.WORK,
          id: entry.id,
          title: `Work ${entry.id}`,
          author: "",
        });
      } else if (entry.type === LINK_TYPES.SERIES) {
        items.push({
          type: LINK_TYPES.SERIES,
          id: entry.id,
          title: "", // the worker reads the real title from the series page
          author: "",
          bundle: savedBundle.has(entry.id),
        });
      } else {
        listings.push(entry);
      }
    }

    const tasks = [];
    if (items.length) {
      tasks.push({
        kind: "items",
        label: describeItems(items),
        items,
        options,
      });
    }
    for (const listing of listings) {
      const suffix = maxPages
        ? ` (${maxPages} page${maxPages === 1 ? "" : "s"})`
        : "";
      tasks.push({
        kind: "listing",
        label: `Listing: ${listing.label}${suffix}`,
        listingLabel: "listing",
        url: listing.href,
        options: { ...options, maxPages },
      });
    }

    try {
      for (const task of tasks) {
        await browser.runtime.sendMessage({ action: "enqueueDownload", task });
      }
      switchTab("queue");
    } catch (error) {
      createNotifPopup(`Could not queue downloads: ${error.message}`);
    }
  }

  const downloadButton = button("Download", submit, "ao3-links-submit");

  element.append(
    hint,
    list,
    addButton,
    bundle.label,
    notSeries.label,
    groupSeries.label,
    pagesField,
    downloadButton,
  );
  renderRows();

  return { element };
}
