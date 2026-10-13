/* globals browser */
import {
  workToLines,
  linesToDataUrl,
  mergeWorks,
  safe,
} from "./download_file.js";

(() => {
  function workInfo(work) {
    const link = work.querySelector("h4.heading a[href^='/works/']");
    if (!link) return null;

    const id = link.getAttribute("href")?.match(/\/works\/(\d+)/)?.[1];
    if (!id) return null;

    return {
      id,
      title: link.innerText.trim(),
      author:
        work.querySelector("a[rel='author']")?.innerText.trim() || "Anonymous",
    };
  }

  function injectCheckboxes() {
    for (const work of document.querySelectorAll(
      ".work.blurb.group, li.blurb.group, dl.series.group",
    )) {
      if (work.querySelector(".ao3-dl-check")) continue;
      if (work.classList.contains("ao3-hidden")) continue;
      const info = workInfo(work);
      if (!info) continue;

      work.style.position = "relative";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "ao3-dl-check";
      cb.dataset.id = info.id;
      cb.dataset.title = info.title;
      cb.dataset.author = info.author;

      cb.style.position = "absolute";
      cb.style.top = "36px";
      cb.style.right = "12px";
      cb.style.zIndex = "10";
      cb.style.cursor = "pointer";

      work.appendChild(cb);
    }
  }
  function injectSeriesCheckbox() {
    let series = document.querySelector("dl.series.group");
    series.style.position = "relative";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "ao3-dl-check";

    cb.style.position = "absolute";
    cb.style.top = "36px";
    cb.style.right = "12px";
    cb.style.zIndex = "10";
    cb.style.cursor = "pointer";

    series.appendChild(cb);
  }

  if (window.__ao3DownloadList) return;
  window.__ao3DownloadList = true;

  if (window.AO3UrlParser?.getWorkUrl(window.location.href)) return;

  const DELAY_MS = 3000;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function loadWork(id) {
    return new Promise((resolve, reject) => {
      const f = document.createElement("iframe");
      f.style.cssText =
        "position:fixed;left:-99999px;top:0;width:1200px;height:800px;";

      f.onload = () => {
        try {
          const href = `${location.origin}/works/${id}`;
          resolve(workToLines(f.contentDocument, href));
        } catch (e) {
          reject(e);
        } finally {
          f.remove();
        }
      };

      f.onerror = () => {
        f.remove();
        reject(new Error("iframe failed"));
      };

      f.src = `/works/${id}?view_full_work=true&view_adult=true`;
      document.body.appendChild(f);
    });
  }

  function makeLabeledCheckbox(id, text) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "4px";
    label.style.cursor = "pointer";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;

    label.append(input, document.createTextNode(` ${text}`));
    return label;
  }

  async function openDownloadButton() {
    const { settings = {} } = await browser.storage.local.get("settings");
    if (!settings["general"]?.["downloadWorks"]) {
      return;
    }

    injectCheckboxes();
    injectSeriesCheckbox();
    const observer = new MutationObserver(() => {
      injectCheckboxes();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let panel = document.getElementById("ao3-dl-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "ao3-dl-panel";

      const allLabel = makeLabeledCheckbox("ao3-dl-all", "All");
      const bundleLabel = makeLabeledCheckbox("ao3-dl-bundle", "Bundle");

      const downloadBtn = document.createElement("button");
      downloadBtn.id = "ao3-dl-btn";
      downloadBtn.type = "button";
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

    allBox.addEventListener("change", () => {
      checks().forEach((c) => (c.checked = allBox.checked));
      refresh();
    });

    btn.addEventListener("click", async () => {
      const items = selected();
      if (!items.length) return;

      const bundle = bundleBox.checked && items.length > 1;
      const loaded = [];

      setBusy(true);

      for (let i = 0; i < items.length; i++) {
        const { id, title, author } = items[i].dataset;
        status.textContent = `${i + 1}/${items.length}: ${title}`;

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
              saveAs: items.length === 1,
            });
          }

          items[i].checked = false;
        } catch (err) {
          console.error(err);
          status.textContent = `Failed: ${title}`;
        }

        if (i < items.length - 1) await sleep(DELAY_MS);
      }

      if (bundle && loaded.length) {
        status.textContent = "Building bundle...";
        try {
          const url = await linesToDataUrl(mergeWorks(loaded));
          await browser.runtime.sendMessage({
            action: "downloadDoc",
            url,
            filename: `AO3_bundle_${loaded.length}_works.docx`,
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

  openDownloadButton();
})();
