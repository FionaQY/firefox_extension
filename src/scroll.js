/* globals browser */
import {
  isValid,
  extractRelevantData,
  WORK_BLURB_SELECTOR,
} from "./helper/extractor";

(() => {
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "initialize") {
      goToWork(msg.data.filterType, msg.data.targetValue);
    }
  });

  async function goToWork(filterType, targetValue) {
    let relevantData = JSON.parse(targetValue || "null");

    if (!filterType || relevantData == null) return;

    if (filterType === "revised_at") {
      relevantData = new Date(relevantData);
    }

    console.log(`Scrolling now...`);
    const works = document.querySelectorAll(WORK_BLURB_SELECTOR);
    for (let i = works.length - 1; i > 0; i--) {
      const work = works[i];

      const extractedData = extractRelevantData(work, filterType);
      if (isValid(relevantData, extractedData)) {
        work.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
  }

  setTimeout(() => {
    console.log("Sending ready message");
    browser.runtime.sendMessage({ action: "scrollContentScriptReady" });
  }, 100);
})();
