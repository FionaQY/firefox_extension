/* globals browser */
import { workToLines, linesToDataUrl, mergeWorks } from "./helper/download.js";
import {
  getSeriesInfo,
  getWorkUrl,
  fetchDoc,
  safeFilename,
  textOf,
} from "./helper/commons.js";
import { workInfo } from "./helper/extractor.js";
import { bookmarkWork } from "./helper/bookmark.js";
import {
  createLabeledCheckbox,
  getButton,
  createNotifPopup,
} from "./helper/popup.js";

const DELAY_MS = 3000;
const MAX_SERIES_PAGES = 50;
const MOBILE_MAX_WIDTH = 768;

const TYPE = { WORK: "work", SERIES: "series" };
const MSG_DOWNLOAD_DOC = "downloadDoc";
const BOOKMARK_CREATED = "created";

const CLS = { CHECK: "ao3-dl-check", HIDDEN: "ao3-hidden" };

const ID = {
  PANEL: "ao3-dl-panel",
  ALL: "ao3-dl-all",
  BUNDLE: "ao3-dl-bundle",
  PRIVATE: "ao3-bm-private",
  DOWNLOAD: "ao3-dl-btn",
  BOOKMARK: "ao3-bm-btn",
  STATUS: "ao3-dl-status",
};

const SEL = {
  BLURB: ".work.blurb.group, li.blurb.group",
  WORK_BLURB: "li.work.blurb.group",
  SERIES_META: "dl.series.meta",
  SERIES_LINK: "h4.heading a[href^='/series/']",
  NEXT_PAGE: "ol.pagination li.next a",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// checkboxes
function seriesInfo(el) {
  const link = el.querySelector(SEL.SERIES_LINK);
  const id = link?.getAttribute("href")?.match(/\/series\/(\d+)/)?.[1];
  if (id) return { id, title: textOf(link) };

  const m = location.pathname.match(/^\/series\/(\d+)/);
  if (m && el.matches(SEL.SERIES_META)) {
    const title = textOf(document.querySelector("h2.heading")) || "series";
    return { id: m[1], title };
  }
  return null;
}

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
}

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
 * FETCHING
 * ========================================================================== */
async function loadWork(id) {
  const doc = await fetchDoc(
    `${location.origin}/works/${id}?view_full_work=true&view_adult=true`,
  );
  return workToLines(doc, `${location.origin}/works/${id}`);
}

async function fetchSeriesWorks(id, onPage) {
  const seriesUrl = `${location.origin}/series/${id}`;
  const works = [];
  let info = null;

  for (let page = 1; page <= MAX_SERIES_PAGES; page++) {
    const doc = await fetchDoc(`${seriesUrl}?page=${page}`);
    if (page === 1) info = getSeriesInfo(doc, seriesUrl);

    const found = [...doc.querySelectorAll(SEL.WORK_BLURB)]
      .map((li) => workInfo(li))
      .filter(Boolean);

    works.push(...found);
    onPage?.(page, works.length);

    if (!found.length || !doc.querySelector(SEL.NEXT_PAGE)) break;
    await sleep(DELAY_MS);
  }
  return { works, info };
}

// helper functions
async function forEachPaced(items, fn) {
  for (let i = 0; i < items.length; i++) {
    await fn(items[i], i);
    if (i < items.length - 1) await sleep(DELAY_MS);
  }
}

async function downloadDoc(lines, filename, saveAs) {
  const url = await linesToDataUrl(lines);
  await browser.runtime.sendMessage({
    action: MSG_DOWNLOAD_DOC,
    url,
    filename,
    saveAs,
  });
}

const docName = (title, author) =>
  `${safeFilename(title)}_${safeFilename(author)}.docx`;

async function expandSelection(items, setStatus) {
  const jobs = new Map();
  const seriesList = [];
  let standalone = 0;

  for (const cb of items) {
    const { type, id, title, author } = cb.dataset;

    if (type === TYPE.SERIES) {
      setStatus(`Reading series: ${title}`);
      try {
        const { works, info } = await fetchSeriesWorks(id, (page, count) =>
          setStatus(`Reading series: ${title} (page ${page}, ${count} works)`),
        );

        seriesList.push({
          title: [title, info?.author].filter(Boolean).join("_"),
          summary: info?.summary ?? "",
        });
        for (const w of works) if (!jobs.has(w.id)) jobs.set(w.id, w);
        cb.checked = false;
      } catch (err) {
        createNotifPopup(`Cannot download series :(: ${err}`);
        setStatus(`Failed to read series: ${title}`);
      }
    } else if (!jobs.has(id)) {
      jobs.set(id, { id, title, author });
      standalone++;
    }
  }

  return { jobs: [...jobs.values()], seriesList, standalone };
}

async function downloadBundle(loaded, seriesList, standalone) {
  const series =
    seriesList.length === 1 && standalone === 0 ? seriesList[0] : null;
  const name = series
    ? `${safeFilename(series.title)}_series.docx`
    : `AO3_bundle_${loaded.length}_works.docx`;

  await downloadDoc(mergeWorks(loaded, series), name, true);
}

/* ==========================================================================
 * PANEL
 * ========================================================================== */
function buildPanel({ downloadOn, bookmarkOn }) {
  const compact = window.innerWidth <= MOBILE_MAX_WIDTH;

  const actionButton = (id, label) => {
    const btn = getButton("primary", compact, `${label} (0)`);
    btn.id = id;
    return btn;
  };

  const status = document.createElement("span");
  status.id = ID.STATUS;

  const panel = document.createElement("div");
  panel.id = ID.PANEL;
  panel.append(
    ...[
      createLabeledCheckbox(ID.ALL, "All"),
      downloadOn && createLabeledCheckbox(ID.BUNDLE, "Bundle"),
      bookmarkOn && createLabeledCheckbox(ID.PRIVATE, "Private"),
      downloadOn && actionButton(ID.DOWNLOAD, "Download"),
      bookmarkOn && actionButton(ID.BOOKMARK, "Bookmark"),
      status,
    ].filter(Boolean),
  );
  return panel;
}

async function openDownloadButton() {
  const { settings = {} } = await browser.storage.local.get("settings");
  const general = settings.general ?? {};
  const downloadOn = Boolean(general.downloadWorks);
  const bookmarkOn = Boolean(general.bookmarkWorks);
  if (!downloadOn && !bookmarkOn) return;

  injectCheckboxes();
  new MutationObserver(injectCheckboxes).observe(document.body, {
    childList: true,
    subtree: true,
  });

  const panel = buildPanel({ downloadOn, bookmarkOn });
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector(`#${id}`);
  const ui = {
    status: $(ID.STATUS),
    all: $(ID.ALL),
    bundle: $(ID.BUNDLE),
    private: $(ID.PRIVATE),
    download: $(ID.DOWNLOAD),
    bookmark: $(ID.BOOKMARK),
  };

  const setStatus = (text) => (ui.status.textContent = text);
  const checks = () => [...document.querySelectorAll(`.${CLS.CHECK}`)];
  const selected = () => checks().filter((c) => c.checked);

  const refresh = () => {
    const n = selected().length;
    if (ui.download) ui.download.textContent = `Download (${n})`;
    if (ui.bookmark) ui.bookmark.textContent = `Bookmark (${n})`;
  };

  const setBusy = (busy) => {
    if (ui.download) ui.download.disabled = busy;
    if (ui.bookmark) ui.bookmark.disabled = busy;
    checks().forEach((c) => (c.disabled = busy));
  };

  // Disables the UI while fn runs and always restores it afterwards.
  const withBusy = (fn) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      refresh();
    }
  };

  /* ---------------------------- DOWNLOAD ---------------------------- */
  async function downloadSelected() {
    const items = selected();
    if (!items.length) return;

    const { jobs, seriesList, standalone } = await expandSelection(
      items,
      setStatus,
    );
    if (!jobs.length) return;

    const bundle = Boolean(ui.bundle?.checked) && jobs.length > 1;
    const loaded = [];

    await forEachPaced(jobs, async ({ id, title, author }, i) => {
      setStatus(`${i + 1}/${jobs.length}: ${title}`);
      try {
        const work = await loadWork(id);

        if (bundle) {
          loaded.push(work);
        } else {
          await downloadDoc(
            work.lines,
            docName(title, author),
            jobs.length === 1,
          );
        }

        const cb = items.find(
          (c) => c.dataset.type === TYPE.WORK && c.dataset.id === id,
        );
        if (cb) cb.checked = false;
      } catch (err) {
        createNotifPopup(`sadge :(: ${err}`);
        setStatus(`Failed: ${title}`);
      }
    });

    if (bundle && loaded.length > 1) {
      setStatus("Building bundle...");
      try {
        await downloadBundle(loaded, seriesList, standalone);
      } catch (err) {
        createNotifPopup(`Cannot bundle :(: ${err}`);
        setStatus("Failed to build bundle");
        return;
      }
    }

    setStatus("Done");
  }

  /* ---------------------------- BOOKMARK ---------------------------- */
  async function bookmarkSelected() {
    const seen = new Set();
    const items = selected().filter(({ dataset }) => {
      const key = `${dataset.type}:${dataset.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const tally = { created: 0, skipped: 0, failed: 0 };

    await forEachPaced(items, async (cb, i) => {
      const { id, title, type } = cb.dataset;
      setStatus(`Bookmarking ${i + 1}/${items.length}: ${title}`);

      try {
        const result = await bookmarkWork(id, {
          makePrivate: Boolean(ui.private?.checked),
          overrideNotes: Boolean(general.overrideBookmark),
          isSeries: type === TYPE.SERIES,
        });

        tally[result === BOOKMARK_CREATED ? "created" : "skipped"]++;
        cb.checked = false;
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

  /* ---------------------------- WIRING ---------------------------- */
  document.addEventListener("change", (e) => {
    if (e.target.classList?.contains(CLS.CHECK)) refresh();
  });

  ui.all.addEventListener("change", () => {
    checks()
      .filter((c) => c.dataset.type === TYPE.WORK)
      .forEach((c) => (c.checked = ui.all.checked));
    refresh();
  });

  ui.download?.addEventListener("click", withBusy(downloadSelected));
  ui.bookmark?.addEventListener("click", withBusy(bookmarkSelected));

  refresh(); // sets the initial "(0)" labels
}

(() => {
  if (window.__ao3DownloadList) return;
  window.__ao3DownloadList = true;

  if (getWorkUrl(window.location.href)) return;

  openDownloadButton();
})();
