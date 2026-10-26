/* globals browser */
import { BASE_URL, fetchDoc, safeFilename, textOf } from "./commons";
import { extractWorkData, getSeriesInfo, workInfo } from "./extractor";
import { getBundleIds } from "./bundle_ids";
import {
  documentToBlob,
  documentsToZipBlob,
  mergeWorks,
  workToDocument,
} from "./docx_builder";

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

async function downloadBundle(works, series) {
  const author =
    series?.author ||
    [...new Set(works.map((w) => w.author).filter(Boolean))].join(", ");
  const arr = series
    ? [series.title, author, "series"]
    : [works[0].title, works[0].author, "bundle"];
  const filename = arr.filter(Boolean).map(safeFilename).join("_") + ".docx";

  await downloadDoc(mergeWorks(works, series), filename, !series);
}

async function downloadSeriesZip(series, works) {
  const entries = works.map(({ work, position }) => ({
    path: getSeriesWorkFilename(work, position, series.workIds.length),
    document: workToDocument(work),
  }));
  const blob = await documentsToZipBlob(entries);
  const filename =
    [series.title, series.author].filter(Boolean).map(safeFilename).join("_") +
    ".zip";
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

  for (let page = 1; page <= MAX_SERIES_PAGES; page++) {
    ensureActive(ctx);
    const doc = await fetchDoc(`${seriesUrl}?page=${page}`);
    if (page === 1) info = getSeriesInfo(doc, seriesUrl);

    const found = [...doc.querySelectorAll(SERIES_SELECTORS.WORK_BLURB)]
      .map((item) => workInfo(item))
      .filter(Boolean);
    works.push(...found);
    onPage?.(page, works.length);

    if (!found.length || !doc.querySelector(SERIES_SELECTORS.NEXT_PAGE)) break;
    await pause(ctx, delayMs);
  }

  return { works, info };
}

/** Crawl every page of an author/bookmark listing and return plain items. */
async function collectListingItems(url, label, ctx) {
  const startUrl = new URL(url);
  const works = new Map();
  const seriesMap = new Map();
  const visitedPages = new Set();
  let pageUrl = startUrl.href;

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

    ctx.setStatus(
      `Reading ${label} (page ${currentPage.searchParams.get("page") || 1})`,
    );
    const doc = await fetchDoc(currentPage.href);
    for (const blurb of doc.querySelectorAll(LISTING_SELECTORS.WORK_BLURBS)) {
      const info = workInfo(blurb);
      if (info) {
        if (!works.has(info.id)) works.set(info.id, info);
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
    if (pageUrl) await pause(ctx, LISTING_DELAY_MS);
  }

  if (!works.size && !seriesMap.size) {
    throw new Error(`No works found in ${label}`);
  }

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

async function expandSelection(items, ctx, delayMs) {
  const jobs = new Map();
  const seriesList = [];
  const readFailures = [];
  let standalone = 0;
  let readAnySeries = false;

  for (const item of items) {
    ensureActive(ctx);
    const { type, id, title, author } = item;

    if (type === TYPE.SERIES) {
      if (readAnySeries) await pause(ctx, delayMs);
      readAnySeries = true;

      ctx.setStatus(`Reading series: ${title}`);
      try {
        const { works, info } = await fetchSeriesWorks(
          id,
          (page, count) =>
            ctx.setStatus(
              `Reading series: ${title} (page ${page}, ${count} works)`,
            ),
          ctx,
          delayMs,
        );
        seriesList.push({
          title,
          summary: info?.summary ?? "",
          author: info?.author ?? "",
          workIds: works.map((work) => work.id),
          bundle: Boolean(item.bundle),
        });
        for (const work of works) {
          if (!jobs.has(work.id)) jobs.set(work.id, work);
        }
      } catch (error) {
        if (error instanceof CancelledError) throw error;
        readFailures.push(`${title} (series)`);
        ctx.logError(`Cannot read series "${title}": ${error}`);
        ctx.setStatus(`Failed to read series: ${title}`);
      }
    } else if (!jobs.has(id)) {
      jobs.set(id, { id, title, author });
      standalone++;
    }
  }

  return { jobs: [...jobs.values()], seriesList, standalone, readFailures };
}

export async function processWorkJobs(
  jobs,
  { bundle, notInSeries, shouldRetainWork, ctx, delayMs },
) {
  const retainedWorks = [];
  const tally = createTally();

  await forEachPaced(
    ctx,
    jobs,
    async ({ id, title, author }, index) => {
      ctx.setStatus(`${index + 1}/${jobs.length}: ${title}`);
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
          await downloadDoc(
            workToDocument(work),
            getWorkFilename(work.title || title, work.author || author),
            jobs.length === 1,
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

async function downloadSeriesOutputs(seriesList, loadedById, tally, ctx) {
  for (const series of seriesList) {
    ensureActive(ctx);
    const works = series.workIds
      .map((id, index) => ({ work: loadedById.get(id), position: index + 1 }))
      .filter(({ work }) => work);
    if (!works.length) {
      if (!tally.skipped) {
        recordFailure(tally, `${series.title} (series: no works loaded)`);
      }
      continue;
    }

    ctx.setStatus(
      `Building ${series.bundle ? "bundle" : "ZIP"}: ${series.title}`,
    );
    try {
      if (series.bundle && works.length > 1) {
        await downloadBundle(
          works.map(({ work }) => work),
          series,
        );
      } else {
        await downloadSeriesZip(series, works);
      }
      tally.downloaded += works.length;
    } catch (error) {
      recordFailure(tally, `${series.title} (series)`, works.length);
      ctx.logError(`Cannot build series "${series.title}": ${error}`);
    }
  }
}

async function downloadSelectedWorks(
  items,
  { bundle: bundleRequested, notInSeries },
  ctx,
  delayMs = DOWNLOAD_DELAY_MS,
) {
  const { jobs, seriesList, standalone, readFailures } = await expandSelection(
    items,
    ctx,
    delayMs,
  );

  if (!jobs.length) {
    const tally = createTally();
    readFailures.forEach((name) => recordFailure(tally, name));
    return tally;
  }

  const bundle = bundleRequested && standalone > 1;
  const seriesWorkIds = new Set(seriesList.flatMap((s) => s.workIds));
  const { retainedWorks, tally } = await processWorkJobs(jobs, {
    bundle,
    notInSeries,
    shouldRetainWork: (id) => seriesWorkIds.has(id),
    ctx,
    delayMs,
  });
  readFailures.forEach((name) => recordFailure(tally, name));

  const loadedById = new Map(retainedWorks.map((work) => [work.id, work]));

  if (bundle) {
    const works = retainedWorks.filter((work) => !seriesWorkIds.has(work.id));
    if (works.length > 1) {
      ctx.setStatus("Building selected works bundle...");
      try {
        await downloadBundle(works, null);
        tally.downloaded += works.length;
      } catch (error) {
        recordFailure(tally, "selected works bundle", works.length);
        ctx.logError(`Could not bundle selected works: ${error}`);
      }
    }
  }

  await downloadSeriesOutputs(seriesList, loadedById, tally, ctx);
  return tally;
}

/** Entry point: run one queued task. Returns the final tally. */
export async function runTask(task, ctx) {
  const options = task.options || {};
  let items = task.items || [];

  if (task.kind === "listing") {
    items = await collectListingItems(
      task.url,
      task.listingLabel || "listing",
      ctx,
    );
  }

  const tally = await downloadSelectedWorks(
    items,
    {
      bundle: Boolean(options.bundle),
      notInSeries: Boolean(options.notInSeries),
    },
    ctx,
  );
  ctx.setStatus(summarize(tally));
  return tally;
}
