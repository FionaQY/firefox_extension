/* globals */

import {
  createNotifPopup,
  parseHtmlFragment,
  createPopupContainer,
} from "./helper/popup";
import { MOBILE_MAX_WIDTH } from "./helper/popup_fields";
import { fetchDoc, getWorkUrl } from "./helper/commons";
import { extractWorkSummary } from "./helper/extractor";

const SUMMARY_POPUP = {
  ID: "ao3-qof-summary-popup",
  EXTRA_CLASS: "summary",
  CONTENT_CLASS: "ao3-summary-content",
  HEADING_CLASS: "ao3-summary-heading",
  TEXT_CLASS: "ao3-summary-text",
  TAGS_CLASS: "ao3-summary-tags",
  TAG_LABEL_CLASS: "ao3-summary-tags-label",
};

const MESSAGE = {
  WORK_ID_MISSING: "Cannot get work ID",
  SUMMARY_FAILED: "Failed to load summary.",
  SUMMARY_LOAD_ERROR: (reason) => `Error loading work: ${reason}`,
  SUMMARY_REQUEST: (url) => `Getting summary from ${url}...`,
};

(() => {
  const currentUrl = window.location.href;
  const workUrl = getWorkUrl(currentUrl, false);
  if (!workUrl) {
    createNotifPopup(MESSAGE.WORK_ID_MISSING);
    return;
  }

  document.getElementById(SUMMARY_POPUP.ID)?.remove();

  async function loadSummary() {
    console.log(MESSAGE.SUMMARY_REQUEST(workUrl));

    try {
      const doc = currentUrl === workUrl ? document : await fetchDoc(workUrl);
      const summary = extractWorkSummary(doc, workUrl);
      if (!summary) {
        createNotifPopup(MESSAGE.SUMMARY_FAILED, 0);
      }
      return summary;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      createNotifPopup(MESSAGE.SUMMARY_LOAD_ERROR(reason), 0);
      return null;
    }
  }

  function createTagRow(category, values) {
    const row = document.createElement("div");
    row.classList.add(SUMMARY_POPUP.TAGS_CLASS);

    const label = document.createElement("span");
    label.classList.add(SUMMARY_POPUP.TAG_LABEL_CLASS);
    label.textContent = `${category}: `;

    const tags = document.createElement("span");
    tags.appendChild(parseHtmlFragment(values.join(", ")));
    row.append(label, tags);
    return row;
  }

  function createSummaryContent({ heading, summary, tags }) {
    const content = document.createElement("div");
    content.classList.add(SUMMARY_POPUP.CONTENT_CLASS);

    const headingElement = document.createElement("div");
    headingElement.classList.add(SUMMARY_POPUP.HEADING_CLASS);
    headingElement.appendChild(parseHtmlFragment(heading));

    const summaryElement = document.createElement("div");
    summaryElement.textContent = summary;
    summaryElement.classList.add(SUMMARY_POPUP.TEXT_CLASS);

    content.append(headingElement, summaryElement);

    for (const [category, values] of Object.entries(tags || {})) {
      if (values.length > 0) {
        content.appendChild(createTagRow(category, values));
      }
    }

    return content;
  }

  async function showSummaryPopup() {
    const summaryData = await loadSummary();
    if (!summaryData) return;
    if (!summaryData.summary) {
      createNotifPopup(MESSAGE.SUMMARY_FAILED);
      return;
    }

    const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
    const popup = createPopupContainer(SUMMARY_POPUP.ID, isMobile, {
      content: createSummaryContent(summaryData),
      extraClasses: [SUMMARY_POPUP.EXTRA_CLASS],
    });
    document.body.appendChild(popup);
  }

  showSummaryPopup();
})();
