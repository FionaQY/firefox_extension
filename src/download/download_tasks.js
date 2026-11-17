/* globals browser */
import { BASE_URL, fetchDoc, textOf } from "../ao3/page.js";
import { safeFilename } from "../utils/text";
import {
  blurbSeries,
  extractWorkData,
  getSeriesInfo,
  workInfo,
} from "../ao3/work.js";
import { getBundleIds } from "../storage/bundles.js";
import {
  documentToBlob,
  documentsToZipBlob,
  mergeWorks,
  workToDocument,
} from "./docx_builder";
import { loadSettings } from "../storage/settings.js";
import {
  getActiveRules,
  pickFolderForWorks,
  withFolder,
} from "./folder_rules.js";

/*
 * ctx = {
 *   isCancelled(): boolean,
 *   setStatus(text): void,
 *   logError(message): void,
 * }
 * Items are plain objects: { type: "work"|"series", id, title, author, bundle? }
 */

export class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}

const DOWNLOAD_DELAY_MS = 3000;
const LISTING_DELAY_MS = 20_000;
const MAX_SERIES_PAGES = 50;
const MAX_LISTED_FAILURES = 5;
const TYPE = { WORK: "work", SERIES: "series" };
const SERIES_SELECTORS = {
  WORK_BLURB: "li.work.blurb.group",
  NEXT_PAGE: "ol.pagination li.next a",
  TITLE: "h2.heading",
};
const LISTING_SELECTORS = {
  WORK_BLURBS: ".work.blurb.group, li.blurb.group",
  SERIES_LINK: "h4.heading a[href^='/series/']",
  NEXT_PAGE: "ol.pagination li.next a",
};

/* ---------- helpers ---------- */

function ensureActive(ctx) {
  if (ctx.isCancelled()) throw new CancelledError();
}

/** Sleep in short slices so a cancel takes effect quickly. */
async function pause(ctx, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    ensureActive(ctx);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(500, Math.max(0, end - Date.now()))),
    );
  }
  ensureActive(ctx);
}

export async function forEachPaced(
  ctx,
  items,
  fn,
  delayMs = DOWNLOAD_DELAY_MS,
) {
  for (let i = 0; i < items.length; i++) {
    ensureActive(ctx);
    await fn(items[i], i);
    if (i < items.length - 1) await pause(ctx, delayMs);
  }
}

function createTally() {
  return { downloaded: 0, skipped: 0, failed: 0, failedItems: [] };
}

function recordFailure(tally, name, count = 1) {
  tally.failed += count;
  tally.failedItems.push(name);
}

function summarize({ downloaded, skipped, failed, failedItems }) {
  let text =
    `Done: ${downloaded} downloaded` +
    (skipped ? `, ${skipped} skipped` : "") +
    (failed ? `, ${failed} failed` : "");

  if (failedItems.length) {
    const shown = failedItems.slice(0, MAX_LISTED_FAILURES);
    const more = failedItems.length - shown.length;
    text += `. Failed: ${shown.join("; ")}`;
    if (more > 0) text += `; and ${more} more`;
    console.warn("AO3 download failures:", failedItems);
  }
  return text;
}

/* ---------- saving files ---------- */

function getWorkFilename(title, author) {
  return `${safeFilename(title)}_${safeFilename(author)}.docx`;
}

function getSeriesWorkFilename(work, position, totalWorks) {
  const order = String(position).padStart(String(totalWorks).length, "0");
  return `${order}_${getWorkFilename(work.title, work.author)}`;
}

/** Folder for a set of works (and the series they belong to, if any). */
function folderFor(ctx, works, series) {
  const facts = series?.author
    ? [{ author: series.author, tags: {} }, ...works]
    : works;
  return pickFolderForWorks(ctx.folderRules, facts);
}

/** Save a Blob through the downloads API and free the object URL afterwards. */
async function saveBlob(blob, filename, saveAs) {
  const blobUrl = URL.createObjectURL(blob);
  let id;
  try {
    id = await browser.downloads.download({ url: blobUrl, filename, saveAs });
  } catch (error) {
    URL.revokeObjectURL(blobUrl);
    throw error;
  }

  const onChanged = (delta) => {
    if (
      delta.id === id &&
      delta.state &&
      (delta.state.current === "complete" ||
        delta.state.current === "interrupted")
    ) {
      URL.revokeObjectURL(blobUrl);
      browser.downloads.onChanged.removeListener(onChanged);
    }
  };
  browser.downloads.onChanged.addListener(onChanged);
}

async function downloadDoc(document, filename, saveAs) {
  await saveBlob(await documentToBlob(document), filename, saveAs);
}

async function downloadBundle(works, series, ctx) {
  const author =
    series?.author ||
    [...new Set(works.map((w) => w.author).filter(Boolean))].join(", ");
  const arr = series
    ? [series.title, author, "series"]
    : [works[0].title, works[0].author, "bundle"];
  const folder = folderFor(ctx, works, series);
  const filename = withFolder(
    arr.filter(Boolean).map(safeFilename).join("_") + ".docx",
    folder,
  );

  await downloadDoc(mergeWorks(works, series), filename, !series && !folder);
}

async function downloadSeriesZip(series, works, ctx) {
  const entries = works.map(({ work, position }) => ({
    path: getSeriesWorkFilename(work, position, series.workIds.length),
    document: workToDocument(work),
  }));
  const blob = await documentsToZipBlob(entries);
  const folder = folderFor(
    ctx,
    works.map(({ work }) => work),
    series,
  );
  const filename = withFolder(
    [series.title, series.author].filter(Boolean).map(safeFilename).join("_") +
      ".zip",
    folder,
  );
  await saveBlob(blob, filename, false);
}

/* ---------- fetching ---------- */

async function loadWork(id) {
  const url = `${BASE_URL}/works/${id}`;
  const doc = await fetchDoc(`${url}?view_full_work=true&view_adult=true`);
  return extractWorkData(doc, url);
}

async function fetchSeriesWorks(id, onPage, ctx, delayMs = DOWNLOAD_DELAY_MS) {
  const seriesUrl = `${BASE_URL}/series/${id}`;
  const works = [];
  let info = null;
  let title = "";

  for (let page = 1; page <= MAX_SERIES_PAGES; page++) {
    ensureActive(ctx);
    const doc = await fetchDoc(`${seriesUrl}?page=${page}`);
    if (page === 1) {
      info = getSeriesInfo(doc, seriesUrl);
      title = textOf(doc.querySelector(SERIES_SELECTORS.TITLE));
    }

    const found = [...doc.querySelectorAll(SERIES_SELECTORS.WORK_BLURB)]
      .map((item) => workInfo(item))
      .filter(Boolean);
    works.push(...found);
    onPage?.(page, works.length);

    if (!found.length || !doc.querySelector(SERIES_SELECTORS.NEXT_PAGE)) break;
    await pause(ctx, delayMs);
  }

  return { works, info, title };
}

/** Crawl a listing's pages and return plain items (works, and series if grouping). */
async function collectListingItems(
  url,
  label,
  ctx,
  { maxPages = Infinity, groupSeries = false } = {},
) {
  const startUrl = new URL(url);
  const works = new Map();
  const seriesMap = new Map();
  const visitedPages = new Set();
  let pageUrl = startUrl.href;
  let pagesRead = 0;

  while (pageUrl) {
    ensureActive(ctx);
    const currentPage = new URL(pageUrl);
    if (
      currentPage.origin !== BASE_URL ||
      currentPage.pathname !== startUrl.pathname
    ) {
      throw new Error("AO3 listing pagination linked to an unexpected page");
    }
    if (visitedPages.has(currentPage.href)) {
      throw new Error("AO3 listing pagination repeated a page");
    }
    visitedPages.add(currentPage.href);
    pagesRead++;

    ctx.setStatus(
      `Reading ${label} (page ${currentPage.searchParams.get("page") || 1})`,
    );
    const doc = await fetchDoc(currentPage.href);
    for (const blurb of doc.querySelectorAll(LISTING_SELECTORS.WORK_BLURBS)) {
      const info = workInfo(blurb);
      if (info) {
        // A work in a series goes into the series set instead of the works.
        const partOf = groupSeries ? blurbSeries(blurb)[0] : null;
        if (partOf) {
          if (!seriesMap.has(partOf.id)) seriesMap.set(partOf.id, partOf);
        } else if (!works.has(info.id)) {
          works.set(info.id, info);
        }
        continue;
      }
      const link = blurb.querySelector(LISTING_SELECTORS.SERIES_LINK);
      const id = link?.getAttribute("href")?.match(/\/series\/(\d+)/)?.[1];
      if (id && !seriesMap.has(id)) {
        seriesMap.set(id, { id, title: textOf(link) });
      }
    }

    const nextLink = doc.querySelector(LISTING_SELECTORS.NEXT_PAGE);
    pageUrl = nextLink
      ? new URL(nextLink.getAttribute("href"), currentPage).href
      : "";
    if (pageUrl && pagesRead >= maxPages) pageUrl = "";
    if (pageUrl) await pause(ctx, LISTING_DELAY_MS);
  }

  if (!works.size && !seriesMap.size) {
    throw new Error(`No works found in ${label}`);
  }
  ctx.setStatus(`Found ${works.size} works and ${seriesMap.size} series`);

  const savedBundle = await getBundleIds();
  return [
    ...[...works.values()].map((work) => ({ type: TYPE.WORK, ...work })),
    ...[...seriesMap.values()].map((series) => ({
      type: TYPE.SERIES,
      ...series,
      author: "",
      bundle: savedBundle.has(series.id),
    })),
  ];
}

/* ---------- workflow ---------- */

export async function processWorkJobs(
  jobs,
  { bundle, notInSeries, shouldRetainWork, ctx, delayMs, prefix = "" },
) {
  const retainedWorks = [];
  const tally = createTally();

  await forEachPaced(
    ctx,
    jobs,
    async ({ id, title, author }, index) => {
      ctx.setStatus(`${prefix}${index + 1}/${jobs.length}: ${title}`);
      try {
        const work = await loadWork(id);
        if (notInSeries && work.tags?.series?.length) {
          tally.skipped++;
          ctx.setStatus(`Skipping ${title} (in series)`);
          return;
        }

        if (bundle || shouldRetainWork(id)) {
          retainedWorks.push({ ...work, id });
        } else {
          const folder = pickFolderForWorks(ctx.folderRules, [work]);
          await downloadDoc(
            workToDocument(work),
            withFolder(
              getWorkFilename(work.title || title, work.author || author),
              folder,
            ),
            jobs.length === 1 && !folder,
          );
          tally.downloaded++;
        }
      } catch (error) {
        if (error instanceof CancelledError) throw error;
        recordFailure(tally, title || `work ${id}`);
        ctx.logError(`Could not download "${title}": ${error}`);
      }
    },
    delayMs,
  );

  return { retainedWorks, tally };
}

function mergeTally(into, from) {
  into.downloaded += from.downloaded;
  into.skipped += from.skipped;
  into.failed += from.failed;
  into.failedItems.push(...from.failedItems);
}

/** Read one series, load its works, save it as a ZIP (or bundle), then free memory. */
async function downloadOneSeries(item, ctx, tally, delayMs) {
  const label = item.title || `Series ${item.id}`;
  ctx.setStatus(`Reading series: ${label}`);

  let read;
  try {
    read = await fetchSeriesWorks(
      item.id,
      (page, count) =>
        ctx.setStatus(
          `Reading series: ${label} (page ${page}, ${count} works)`,
        ),
      ctx,
      delayMs,
    );
  } catch (error) {
    if (error instanceof CancelledError) throw error;
    recordFailure(tally, `${label} (series)`);
    ctx.logError(`Cannot read series "${label}": ${error}`);
    return;
  }

  const series = {
    title: item.title || read.title || label,
    summary: read.info?.summary ?? "",
    author: read.info?.author ?? "",
    workIds: read.works.map((work) => work.id),
    bundle: Boolean(item.bundle),
  };

  const { retainedWorks, tally: part } = await processWorkJobs(read.works, {
    bundle: false,
    notInSeries: false,
    shouldRetainWork: () => true,
    ctx,
    delayMs,
    prefix: `${series.title}: `,
  });
  mergeTally(tally, part);

  const byId = new Map(retainedWorks.map((work) => [work.id, work]));
  const works = series.workIds
    .map((id, index) => ({ work: byId.get(id), position: index + 1 }))
    .filter(({ work }) => work);
  if (!works.length) {
    if (!part.failed) {
      recordFailure(tally, `${series.title} (series: no works loaded)`);
    }
    return;
  }

  ctx.setStatus(
    `Building ${series.bundle ? "bundle" : "ZIP"}: ${series.title}`,
  );
  try {
    if (series.bundle && works.length > 1) {
      await downloadBundle(
        works.map(({ work }) => work),
        series,
        ctx,
      );
    } else {
      await downloadSeriesZip(series, works, ctx);
    }
    tally.downloaded += works.length;
  } catch (error) {
    recordFailure(tally, `${series.title} (series)`, works.length);
    ctx.logError(`Cannot build series "${series.title}": ${error}`);
  }
}

const uniqueById = (list) => [
  ...new Map(list.map((item) => [item.id, item])).values(),
];

async function downloadSelectedWorks(
  items,
  { bundle: bundleRequested, notInSeries },
  ctx,
  delayMs = DOWNLOAD_DELAY_MS,
) {
  const tally = createTally();
  const standalone = uniqueById(items.filter((i) => i.type === TYPE.WORK));
  const allSeries = uniqueById(items.filter((i) => i.type === TYPE.SERIES));

  // "Not in series" means series are left out entirely.
  if (notInSeries) tally.skipped += allSeries.length;
  const seriesItems = notInSeries ? [] : allSeries;

  // 1. Standalone works first.
  if (standalone.length) {
    const bundle = bundleRequested && standalone.length > 1;
    const { retainedWorks, tally: part } = await processWorkJobs(standalone, {
      bundle,
      notInSeries,
      shouldRetainWork: () => false,
      ctx,
      delayMs,
    });
    mergeTally(tally, part);

    if (retainedWorks.length) {
      ctx.setStatus("Building selected works bundle...");
      try {
        await downloadBundle(retainedWorks, null, ctx);
        tally.downloaded += retainedWorks.length;
      } catch (error) {
        recordFailure(tally, "selected works bundle", retainedWorks.length);
        ctx.logError(`Could not bundle selected works: ${error}`);
      }
    }
  }

  // 2. Then each series, one at a time.
  for (const [i, item] of seriesItems.entries()) {
    if (i > 0 || standalone.length) await pause(ctx, delayMs);
    await downloadOneSeries(item, ctx, tally, delayMs);
  }

  return tally;
}

/** Entry point: run one queued task. Returns the final tally. */
export async function runTask(task, ctx) {
  const settings = await loadSettings();
  ctx.folderRules = getActiveRules(settings.folders);
  const options = task.options || {};
  const notInSeries = Boolean(options.notInSeries);
  let items = task.items || [];

  if (task.kind === "listing") {
    const limit = Number(options.maxPages);
    items = await collectListingItems(
      task.url,
      task.listingLabel || "listing",
      ctx,
      {
        maxPages: limit >= 1 ? limit : Infinity,
        groupSeries: Boolean(options.groupSeries) && !notInSeries,
      },
    );
  }

  const tally = await downloadSelectedWorks(
    items,
    { bundle: Boolean(options.bundle), notInSeries },
    ctx,
  );
  ctx.setStatus(summarize(tally));
  return tally;
}
