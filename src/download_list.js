/* globals browser */
import {
  workToLines,
  linesToDataUrl,
  mergeWorks,
  safe,
} from "./download_file.js";

import { getWorkUrl, fetchDoc } from "./helper/commons.js";
import { workInfo } from "./helper/extractor.js";
import { createLabeledCheckbox, getButton } from "./helper/popup.js";

const DELAY_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function seriesInfo(el) {
  const link = el.querySelector("h4.heading a[href^='/series/']");
  if (link) {
    const id = link.getAttribute("href")?.match(/\/series\/(\d+)/)?.[1];
    if (id) return { id, title: link.innerText.trim() };
  }
  const m = location.pathname.match(/^\/series\/(\d+)/);
  if (m && el.matches("dl.series.meta")) {
    const title =
      document.querySelector("h2.heading")?.innerText.trim() || "series";
    return { id: m[1], title };
  }
  return null;
}

function addCheckbox(container, data) {
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "ao3-dl-check";
  Object.assign(cb.dataset, data);

  cb.style.position = "absolute";
  cb.style.top = "36px";
  cb.style.right = "12px";
  cb.style.zIndex = "10";
  cb.style.cursor = "pointer";

  container.style.position = "relative";
  container.appendChild(cb);
}

function injectCheckboxes() {
  for (const work of document.querySelectorAll(
    ".work.blurb.group, li.blurb.group",
  )) {
    if (work.querySelector(".ao3-dl-check")) continue;
    if (work.classList.contains("ao3-hidden")) continue;

    const info = workInfo(work);
    if (info) {
      addCheckbox(work, { type: "work", ...info });
      continue;
    }

    const series = seriesInfo(work);
    if (series) addCheckbox(work, { type: "series", ...series });
  }

  for (const dl of document.querySelectorAll("dl.series.meta")) {
    if (dl.querySelector(".ao3-dl-check")) continue;
    const series = seriesInfo(dl);
    if (series) addCheckbox(dl, { type: "series", ...series });
  }
}

async function loadWork(id) {
  const doc = await fetchDoc(
    `https://archiveofourown.org/works/${id}?view_full_work=true&view_adult=true`,
  );
  return workToLines(doc, `${location.origin}/works/${id}`);
}

async function fetchSeriesWorks(id, onPage) {
  const works = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(
      `https://archiveofourown.org/series/${id}?page=${page}`,
      {
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error(`series ${id} page ${page}: ${res.status}`);

    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    let found = 0;
    for (const li of doc.querySelectorAll("li.work.blurb.group")) {
      const info = workInfo(li);
      if (info) {
        works.push(info);
        found++;
      }
    }
    onPage?.(page, works.length);

    const hasNext = doc.querySelector("ol.pagination li.next a");
    if (!found || !hasNext) break;
    await sleep(DELAY_MS);
  }
  return works;
}

async function openDownloadButton() {
  const { settings = {} } = await browser.storage.local.get("settings");
  if (!settings["general"]?.["downloadWorks"]) return;

  injectCheckboxes();
  const observer = new MutationObserver(() => injectCheckboxes());
  observer.observe(document.body, { childList: true, subtree: true });

  let panel = document.getElementById("ao3-dl-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "ao3-dl-panel";

    const allLabel = createLabeledCheckbox("ao3-dl-all", "All");
    const bundleLabel = createLabeledCheckbox("ao3-dl-bundle", "Bundle");

    const downloadBtn = getButton(
      "primary",
      window.innerWidth <= 768,
      "Download (0)",
    );
    downloadBtn.id = "ao3-dl-btn";
    downloadBtn.textContent = "Download (0)";

    const statusSpan = document.createElement("span");
    statusSpan.id = "ao3-dl-status";

    panel.append(allLabel, bundleLabel, downloadBtn, statusSpan);
    document.body.appendChild(panel);
  }

  const btn = panel.querySelector("#ao3-dl-btn");
  const status = panel.querySelector("#ao3-dl-status");
  const allBox = panel.querySelector("#ao3-dl-all");
  const bundleBox = panel.querySelector("#ao3-dl-bundle");

  const checks = () => [...document.querySelectorAll(".ao3-dl-check")];
  const selected = () => checks().filter((c) => c.checked);
  const refresh = () => {
    btn.textContent = `Download (${selected().length})`;
  };
  const setBusy = (busy) => {
    btn.disabled = busy;
    checks().forEach((x) => (x.disabled = busy));
  };

  document.addEventListener("change", (e) => {
    if (e.target.classList?.contains("ao3-dl-check")) refresh();
  });

  // "All" selects individual works only, never whole series
  allBox.addEventListener("change", () => {
    checks()
      .filter((c) => c.dataset.type === "work")
      .forEach((c) => (c.checked = allBox.checked));
    refresh();
  });

  btn.addEventListener("click", async () => {
    const items = selected();
    if (!items.length) return;

    setBusy(true);

    // ---- 1. expand selection into a flat, de-duplicated work list ----
    const jobs = [];
    const seen = new Set();
    const seriesTitles = [];
    let standalone = 0;

    for (const cb of items) {
      const { type, id, title, author } = cb.dataset;

      if (type === "series") {
        status.textContent = `Reading series: ${title}`;
        try {
          const works = await fetchSeriesWorks(id, (p, n) => {
            status.textContent = `Reading series: ${title} (page ${p}, ${n} works)`;
          });
          seriesTitles.push(title);
          for (const w of works) {
            if (!seen.has(w.id)) {
              seen.add(w.id);
              jobs.push(w);
            }
          }
          cb.checked = false;
        } catch (err) {
          console.error(err);
          status.textContent = `Failed to read series: ${title}`;
        }
      } else if (!seen.has(id)) {
        seen.add(id);
        jobs.push({ id, title, author });
        standalone++;
      }
    }

    if (!jobs.length) {
      setBusy(false);
      refresh();
      return;
    }

    const bundle = bundleBox.checked && jobs.length > 1;
    const loaded = [];

    for (let i = 0; i < jobs.length; i++) {
      const { id, title, author } = jobs[i];
      status.textContent = `${i + 1}/${jobs.length}: ${title}`;

      try {
        const work = await loadWork(id);

        if (bundle) {
          loaded.push(work);
        } else {
          const url = await linesToDataUrl(work.lines);
          await browser.runtime.sendMessage({
            action: "downloadDoc",
            url,
            filename: `${safe(title)}_${safe(author)}.docx`,
            saveAs: jobs.length === 1,
          });
        }

        // uncheck the matching work checkbox, if it's on this page
        const cb = items.find(
          (c) => c.dataset.type === "work" && c.dataset.id === id,
        );
        if (cb) cb.checked = false;
      } catch (err) {
        console.error(err);
        status.textContent = `Failed: ${title}`;
      }

      if (i < jobs.length - 1) await sleep(DELAY_MS);
    }

    // ---- 3. build the bundle ----
    if (bundle && loaded.length > 1) {
      status.textContent = "Building bundle...";
      try {
        const name =
          seriesTitles.length === 1 && standalone === 0
            ? `${safe(seriesTitles[0])}_series.docx`
            : `AO3_bundle_${loaded.length}_works.docx`;

        const url = await linesToDataUrl(mergeWorks(loaded));
        await browser.runtime.sendMessage({
          action: "downloadDoc",
          url,
          filename: name,
          saveAs: true,
        });
      } catch (err) {
        console.error(err);
        status.textContent = "Failed to build bundle";
        setBusy(false);
        return;
      }
    }

    status.textContent = "Done";
    setBusy(false);
    refresh();
  });
}

(() => {
  if (window.__ao3DownloadList) return;
  window.__ao3DownloadList = true;

  if (getWorkUrl(window.location.href)) return;

  openDownloadButton();
})();
