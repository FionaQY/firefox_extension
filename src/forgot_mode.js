/* globals */

import {
  createNotifPopup,
  parseHtmlFragment,
  createPopupContainer,
} from "./helper/popup";
import { getSummary, getWorkUrl } from "./helper/commons";
(() => {
  const currentUrl = window.location.href;
  const workUrl = getWorkUrl(currentUrl, false);
  if (!workUrl) {
    createNotifPopup("Cannot get work ID");
    return;
  }

  const popupId = "ao3-qof-popup";
  document.getElementById(popupId)?.remove();

  async function showSummaryPopup() {
    let summaryData = await getSummary(currentUrl, workUrl);
    if (!summaryData?.summary) {
      const neworkUrl = getWorkUrl(currentUrl, false);
      summaryData = await getSummary(currentUrl, neworkUrl);
      if (!summaryData?.summary) {
        createNotifPopup("Failed to load summary.");
        return;
      }
    }

    const { heading, summary, tags } = summaryData;

    const isMobile = window.innerWidth <= 768;

    const content = document.createElement("div");
    content.classList.add("ao3-summary-content");

    const headingEl = document.createElement("div");
    headingEl.classList.add("ao3-summary-heading");
    headingEl.appendChild(parseHtmlFragment(heading));
    content.appendChild(headingEl);

    const summaryEl = document.createElement("div");
    summaryEl.textContent = summary;
    summaryEl.classList.add("ao3-summary-text");
    content.appendChild(summaryEl);

    if (tags && Object.keys(tags).length > 0) {
      for (const [key, values] of Object.entries(tags)) {
        if (values.length === 0) continue;
        const tagContainer = document.createElement("div");
        tagContainer.classList.add("ao3-summary-tags");
        const label = document.createElement("span");
        label.classList.add("ao3-summary-tags-label");
        label.textContent = `${key}: `;
        tagContainer.appendChild(label);
        const valueSpan = document.createElement("span");
        valueSpan.appendChild(parseHtmlFragment(values.join(", ")));
        tagContainer.appendChild(valueSpan);
        content.appendChild(tagContainer);
      }
    }

    const popup = createPopupContainer(popupId, isMobile, {
      content: content,
      extraClasses: ["summary"],
    });

    document.body.appendChild(popup);
  }

  showSummaryPopup();
})();
