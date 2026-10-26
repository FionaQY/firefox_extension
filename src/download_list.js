/* globals browser */
import { getBundleIds, setBundleId } from "./helper/bundle_ids";
import { getWorkUrl, textOf } from "./helper/commons";
import { workInfo } from "./helper/extractor";
import { bookmarkWork } from "./helper/bookmark";
import { getButton, createNotifPopup, getSettings } from "./helper/popup";
import { createLabeledCheckbox, MOBILE_MAX_WIDTH } from "./helper/popup_fields";
import { forEachPaced } from "./helper/download_tasks";

const TYPE = { WORK: "work", SERIES: "series" };
const BOOKMARK_CREATED = "created";

const CLS = {
  CHECK: "ao3-dl-check",
  SERIES_BUNDLE: "ao3-dl-series-bundle",
  HIDDEN: "ao3-hidden",
  ROW: "ao3-dl-row",
  SELECTION_ROW: "ao3-dl-selection-row",
  DOWNLOAD_ROW: "ao3-dl-download-row",
  BOOKMARK_ROW: "ao3-dl-bookmark-row",
  PAGE_DOWNLOAD_ROW: "ao3-dl-page-download-row",
};

const ID = {
  PANEL: "ao3-dl-panel",
  ALL: "ao3-dl-all",
  BUNDLE: "ao3-dl-bundle",
  PRIVATE: "ao3-bm-private",
  NOT_SERIES: "ao3-dl-not-in-series",
  DOWNLOAD: "ao3-dl-btn",
  PAGE_DOWNLOAD: "ao3-dl-page-download-btn",
  BOOKMARK: "ao3-bm-btn",
  STATUS: "ao3-dl-status",
  STATUS_BTN: "ao3-dl-status-btn",
};

const PAGE = {
  AUTHOR_WORKS: /^\/users\/[^/]+\/(?:pseuds\/[^/]+\/)?works\/?$/,
  BOOKMARKS: /^\/users\/[^/]+\/(?:pseuds\/[^/]+\/)?(?:bookmarks|series)\/?$/,
  // Bare paths, only valid when filtered to a user via ?user_id=
  FILTERED_WORKS: /^\/works\/?$/,
  FILTERED_BOOKMARKS: /^\/bookmarks\/?$/,
};

/** Return the page-wide download action for supported AO3 listing pages. */
function getPageDownloadAction() {
  const { pathname, search } = location;
  const hasUser = new URLSearchParams(search).has("user_id");

  if (
    PAGE.AUTHOR_WORKS.test(pathname) ||
    (hasUser && PAGE.FILTERED_WORKS.test(pathname))
  ) {
    return { buttonLabel: "Download all works", itemLabel: "author's works" };
  }
  if (
    PAGE.BOOKMARKS.test(pathname) ||
    (hasUser && PAGE.FILTERED_BOOKMARKS.test(pathname))
  ) {
    return { buttonLabel: "Download all bookmarks", itemLabel: "bookmarks" };
  }
  return null;
}

const SEL = {
  BLURB: ".work.blurb.group, li.blurb.group",
  SERIES_META: "dl.series.meta",
  SERIES_LINK: "h4.heading a[href^='/series/']",
  SERIES_TITLE: "h2.heading",
};

const FALLBACK_SERIES_TITLE = "series";

/* ==========================================================================
 * WORK SELECTION
 * ========================================================================== */

/** Read series metadata from a work blurb or the current series page. */
function seriesInfo(el) {
  const link = el.querySelector(SEL.SERIES_LINK);
  const id = link?.getAttribute("href")?.match(/\/series\/(\d+)/)?.[1];
  if (id) return { id, title: textOf(link) };

  const m = location.pathname.match(/^\/series\/(\d+)/);
  if (m && el.matches(SEL.SERIES_META)) {
    const title =
      textOf(document.querySelector(SEL.SERIES_TITLE)) || FALLBACK_SERIES_TITLE;
    return { id: m[1], title };
  }
  return null;
}

/** Add the "Bundle" checkbox (series only), TODO: make it look nicer **/
function addSeriesBundleCheckbox(container, seriesId) {
  const label = document.createElement("label");
  label.style.cssText =
    "position:absolute;top:60px;right:12px;z-index:10;cursor:pointer;font-size:12px";

  const bundleCb = document.createElement("input");
  bundleCb.type = "checkbox";
  bundleCb.className = CLS.SERIES_BUNDLE;
  let changed = false;

  getBundleIds()
    .then((ids) => {
      if (!changed) bundleCb.checked = ids.has(seriesId);
    })
    .catch((error) => {
      createNotifPopup(`Could not load saved bundle choice: ${error.message}`);
    });
  bundleCb.addEventListener("change", () => {
    changed = true;
    setBundleId(seriesId, bundleCb.checked).catch((error) => {
      createNotifPopup(`Could not save bundle choice: ${error.message}`);
    });
  });

  label.append(bundleCb, " Bundle");
  container.appendChild(label);
}

/** Add the selection checkbox and its work/series metadata to a page item. */
function addCheckbox(container, data) {
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = CLS.CHECK;
  Object.assign(cb.dataset, data);
  Object.assign(cb.style, {
    position: "absolute",
    top: "36px",
    right: "12px",
    zIndex: "10",
    cursor: "pointer",
  });

  container.style.position = "relative";
  container.appendChild(cb);

  if (data.type === TYPE.SERIES) addSeriesBundleCheckbox(container, data.id);
}

/** Add selection checkboxes to work and series blurbs, including new content. */
function injectCheckboxes() {
  const targets = document.querySelectorAll(`${SEL.BLURB}, ${SEL.SERIES_META}`);

  for (const el of targets) {
    if (el.querySelector(`.${CLS.CHECK}`)) continue;
    if (el.classList.contains(CLS.HIDDEN)) continue;

    const work = el.matches(SEL.SERIES_META) ? null : workInfo(el);
    if (work) {
      addCheckbox(el, { type: TYPE.WORK, ...work });
      continue;
    }

    const series = seriesInfo(el);
    if (series) addCheckbox(el, { type: TYPE.SERIES, ...series });
  }
}

/* ==========================================================================
 * DOWNLOAD AND BOOKMARK WORKFLOWS
 * ========================================================================== */

/** Bookmark selected works and series while reporting a final outcome tally. */
async function bookmarkSelected(items, { ui, general, setStatus }) {
  const seen = new Set();
  const uniqueItems = items.filter(({ dataset }) => {
    const key = `${dataset.type}:${dataset.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const tally = { created: 0, skipped: 0, failed: 0 };

  await forEachPaced(uniqueItems, async (checkbox, i) => {
    const { id, title, type } = checkbox.dataset;
    setStatus(`Bookmarking ${i + 1}/${uniqueItems.length}: ${title}`);

    try {
      const result = await bookmarkWork(id, {
        makePrivate: Boolean(ui.private?.checked),
        overrideNotes: Boolean(general.overrideBookmark),
        isSeries: type === TYPE.SERIES,
      });
      tally[result === BOOKMARK_CREATED ? "created" : "skipped"]++;
      checkbox.checked = false;
    } catch (err) {
      tally.failed++;
      createNotifPopup(`Could not bookmark "${title}": ${err.message}`);
    }
  });

  setStatus(
    `Done: ${tally.created} bookmarked` +
      (tally.skipped ? `, ${tally.skipped} already bookmarked` : "") +
      (tally.failed ? `, ${tally.failed} failed` : ""),
  );
}

function toTaskItem(checkbox) {
  const { type, id, title, author = "" } = checkbox.dataset;
  const item = { type, id, title, author };
  if (type === TYPE.SERIES) {
    item.bundle = Boolean(
      checkbox.parentElement?.querySelector(`.${CLS.SERIES_BUNDLE}`)?.checked,
    );
  }
  return item;
}

function describeItems(items) {
  if (items.length === 1) {
    const [item] = items;
    return `${item.type === TYPE.SERIES ? "Series" : "Work"}: ${item.title}`;
  }
  const series = items.filter((i) => i.type === TYPE.SERIES).length;
  const works = items.length - series;
  return [
    `${items.length} items`,
    `(${[works && `${works} works`, series && `${series} series`]
      .filter(Boolean)
      .join(", ")})`,
  ].join(" ");
}

function enqueueDownload(task) {
  return browser.runtime.sendMessage({ action: "enqueueDownload", task });
}

/* ==========================================================================
 * PANEL UI
 * ========================================================================== */

/** Create the floating panel and the controls enabled by current settings. */
function buildPanel({ downloadOn, bookmarkOn, pageDownload }) {
  const compact = window.innerWidth <= MOBILE_MAX_WIDTH;
  // Create a panel action button with its initial selection count.
  const actionButton = (id, label) => {
    const btn = getButton("primary", compact, `${label} (0)`);
    btn.id = id;
    return btn;
  };
  // Wrap related controls in a row with the matching layout class.
  const row = (className, ...children) => {
    const element = document.createElement("div");
    element.classList.add(CLS.ROW, className);
    element.append(...children.filter(Boolean));
    return element;
  };
  const status = document.createElement("span");
  status.id = ID.STATUS;
  const pageDownloadButton = pageDownload
    ? getButton("primary", compact, pageDownload.buttonLabel)
    : null;
  if (pageDownloadButton) pageDownloadButton.id = ID.PAGE_DOWNLOAD;
  const statusButton = getButton("secondary", compact, "Download Status");
  statusButton.id = ID.STATUS_BTN;

  const panel = document.createElement("div");
  panel.id = ID.PANEL;
  panel.append(
    ...[
      row(
        CLS.SELECTION_ROW,
        createLabeledCheckbox(ID.ALL, "All in page"),
        statusButton,
      ),
      downloadOn &&
        row(
          CLS.DOWNLOAD_ROW,
          createLabeledCheckbox(ID.NOT_SERIES, "Not in Series"),
          createLabeledCheckbox(ID.BUNDLE, "Bundle"),
          actionButton(ID.DOWNLOAD, "Download"),
        ),
      bookmarkOn &&
        row(
          CLS.BOOKMARK_ROW,
          createLabeledCheckbox(ID.PRIVATE, "Private"),
          actionButton(ID.BOOKMARK, "Bookmark"),
        ),
      downloadOn &&
        pageDownload &&
        row(CLS.PAGE_DOWNLOAD_ROW, pageDownloadButton),
      status,
    ].filter(Boolean),
  );
  return panel;
}

/** Find panel controls once and expose them by purpose rather than selector. */
function getPanelControls(panel) {
  // Find a control by its panel-local ID.
  const find = (id) => panel.querySelector(`#${id}`);
  return {
    status: find(ID.STATUS),
    statusButton: find(ID.STATUS_BTN),
    all: find(ID.ALL),
    bundle: find(ID.BUNDLE),
    private: find(ID.PRIVATE),
    notSeries: find(ID.NOT_SERIES),
    download: find(ID.DOWNLOAD),
    pageDownload: find(ID.PAGE_DOWNLOAD),
    bookmark: find(ID.BOOKMARK),
  };
}

/** Return all injected work and series selection checkboxes on the page. */
function getSelectionCheckboxes() {
  return [...document.querySelectorAll(`.${CLS.CHECK}`)];
}

/** Update action button counts from the current page selection. */
function refreshPanelCounts(ui) {
  const count = getSelectionCheckboxes().filter(
    (checkbox) => checkbox.checked,
  ).length;
  if (ui.download) ui.download.textContent = `Download (${count})`;
  if (ui.bookmark) ui.bookmark.textContent = `Bookmark (${count})`;
}

/** Disable panel actions and item checkboxes while a workflow is running. */
function setPanelBusy(ui, busy) {
  if (ui.download) ui.download.disabled = busy;
  if (ui.pageDownload) ui.pageDownload.disabled = busy;
  if (ui.bookmark) ui.bookmark.disabled = busy;
  getSelectionCheckboxes().forEach((checkbox) => (checkbox.disabled = busy));
}

/** Run an action while disabling the panel, then restore controls and counts. */
function withBusy(fn, ui) {
  return async () => {
    setPanelBusy(ui, true);
    try {
      await fn();
    } finally {
      setPanelBusy(ui, false);
      refreshPanelCounts(ui);
    }
  };
}

/** Connect selection, download, and bookmark interactions to panel controls. */
function wirePanel(ui, general, pageDownload) {
  const selected = () =>
    getSelectionCheckboxes().filter((checkbox) => checkbox.checked);
  const setStatus = (text) => {
    ui.status.textContent = text;
  };
  const refresh = () => refreshPanelCounts(ui);
  const options = () => ({
    bundle: Boolean(ui.bundle?.checked),
    notInSeries: Boolean(ui.notSeries?.checked),
  });

  document.addEventListener("change", (event) => {
    if (event.target.classList?.contains(CLS.CHECK)) refresh();
  });
  ui.all.addEventListener("change", () => {
    getSelectionCheckboxes().forEach(
      (checkbox) => (checkbox.checked = ui.all.checked),
    );
    refresh();
  });

  ui.download?.addEventListener("click", async () => {
    const checkboxes = selected();
    if (!checkboxes.length) {
      setStatus("Nothing selected");
      return;
    }
    const items = checkboxes.map(toTaskItem);
    try {
      await enqueueDownload({
        kind: "items",
        label: describeItems(items),
        items,
        options: options(),
      });
      checkboxes.forEach((checkbox) => (checkbox.checked = false));
      ui.all.checked = false;
      refresh();
      setStatus('Queued. Follow progress in "Download status".');
    } catch (error) {
      createNotifPopup(`Could not queue download: ${error.message}`);
    }
  });

  ui.pageDownload?.addEventListener("click", async () => {
    const { buttonLabel, itemLabel } = pageDownload;
    const heading = document.querySelector("h2.heading")?.textContent.trim();
    try {
      await enqueueDownload({
        kind: "listing",
        label: `${buttonLabel}${heading ? `: ${heading}` : ""}`,
        listingLabel: itemLabel,
        url: window.location.href,
        options: options(),
      });
      setStatus('Queued. Follow progress in "Download status".');
    } catch (error) {
      createNotifPopup(`Could not queue ${itemLabel}: ${error.message}`);
    }
  });
  ui.bookmark?.addEventListener(
    "click",
    withBusy(
      () => bookmarkSelected(selected(), { ui, general, setStatus }),
      ui,
    ),
  );
  ui.statusButton?.addEventListener("click", async () => {
    try {
      await browser.runtime.sendMessage({
        action: "executeMode",
        mode: "status",
      });
    } catch (error) {
      createNotifPopup(`Could not open download status: ${error.message}`);
    }
  });

  refresh();
}
/** Load settings, observe dynamic page content, and display the download panel. */
async function openDownloadButton() {
  const settings = await getSettings();
  const general = settings.general ?? {};
  const downloadOn = Boolean(general.downloadWorks);
  const bookmarkOn = Boolean(general.bookmarkWorks);
  if (!downloadOn && !bookmarkOn) return;
  const pageDownload = getPageDownloadAction();

  injectCheckboxes();
  new MutationObserver(injectCheckboxes).observe(document.body, {
    childList: true,
    subtree: true,
  });

  const panel = buildPanel({ downloadOn, bookmarkOn, pageDownload });
  document.body.appendChild(panel);
  wirePanel(getPanelControls(panel), general, pageDownload);
}

(() => {
  if (window.__ao3DownloadList) return;
  window.__ao3DownloadList = true;

  if (getWorkUrl(window.location.href)) return;

  openDownloadButton();
})();
