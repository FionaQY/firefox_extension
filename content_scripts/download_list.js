/* globals browser */
import { workToLines, linesToDataUrl, safe } from "./download_file.js";

(() => {
  function workInfo(work) {
    const link = work.querySelector("h4.heading a[href^='/works/']");
    if (!link) return null;

    const id = link.getAttribute("href")?.match(/\/works\/(\d+)/)?.[1];
    if (!id) return null;

    return {
      id,
      title: link.innerText.trim(),
      author: work.querySelector("a[rel='author']")?.innerText.trim() || "Anonymous",
    };
  }

  function injectCheckboxes() {
    for (const work of document.querySelectorAll(".work.blurb.group, li.blurb.group")) {
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

  if (window.__ao3DownloadList) return;
  window.__ao3DownloadList = true;

  if (window.AO3UrlParser?.getWorkUrl(window.location.href)) return;

  const DELAY_MS = 3000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function loadWork(id) {
    return new Promise((resolve, reject) => {
      const f = document.createElement("iframe");
      f.style.cssText = "position:fixed;left:-99999px;top:0;width:1200px;height:800px;";

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

  async function openDownloadButton() {
    const { settings = {} } = await browser.storage.local.get("settings");
    if (!settings["general"]?.["downloadWorks"]) {
      return;
    }

    injectCheckboxes();
    const observer = new MutationObserver(() => injectCheckboxes());
    observer.observe(document.body, { childList: true, subtree: true });

    let panel = document.getElementById("ao3-dl-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "ao3-dl-panel";
      const allLabel = document.createElement("label");
      allLabel.style.display = "flex";
      allLabel.style.alignItems = "center";
      allLabel.style.gap = "4px";
      allLabel.style.cursor = "pointer";

      const allBoxInput = document.createElement("input");
      allBoxInput.type = "checkbox";
      allBoxInput.id = "ao3-dl-all";

      allLabel.appendChild(allBoxInput);
      allLabel.appendChild(document.createTextNode(" All"));

      const downloadBtn = document.createElement("button");
      downloadBtn.id = "ao3-dl-btn";
      downloadBtn.type = "button";
      downloadBtn.textContent = "Download (0)";

      const statusSpan = document.createElement("span");
      statusSpan.id = "ao3-dl-status";

      panel.append(allLabel, downloadBtn, statusSpan);
      document.body.appendChild(panel);
    }

    const btn = panel.querySelector("#ao3-dl-btn");
    const status = panel.querySelector("#ao3-dl-status");
    const allBox = panel.querySelector("#ao3-dl-all");

    const checks = () => [...document.querySelectorAll(".ao3-dl-check")];

    const selected = () => checks().filter(c => c.checked);
    const refresh = () => {
      btn.textContent = `Download (${selected().length})`;
    };

    document.addEventListener("change", e => {
      if (e.target.classList?.contains("ao3-dl-check")) refresh();
    });

    allBox.addEventListener("change", () => {
      checks().forEach(c => (c.checked = allBox.checked));
      refresh();
    });

    btn.addEventListener("click", async () => {
      const items = selected();
      if (!items.length) return;

      btn.disabled = true;
      checks().forEach(x => (x.disabled = true));

      for (let i = 0; i < items.length; i++) {
        const { id, title, author } = items[i].dataset;

        status.textContent = `${i + 1}/${items.length}: ${title}`;

        try {
          const { lines } = await loadWork(id);
          const url = await linesToDataUrl(lines);

          await browser.runtime.sendMessage({
            action: "downloadDoc",
            url,
            filename: `${safe(title)}_${safe(author)}.docx`,
            saveAs: items.length === 1,
          });

          items[i].checked = false;
        } catch (err) {
          console.error(err);
          status.textContent = `Failed: ${title}`;
        }

        if (i < items.length - 1) await sleep(DELAY_MS);
      }

      status.textContent = "Done";
      btn.disabled = false;
      checks().forEach(x => (x.disabled = false));
      refresh();
    });
  }

  openDownloadButton();
})();