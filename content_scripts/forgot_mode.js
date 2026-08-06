/* eslint-disable no-unused-vars */
/* globals AO3Popup, AO3UrlParser */
/* eslint-enable no-unused-vars */
(() => {
  const currentUrl = window.location.href;
  const workUrl = window.AO3UrlParser.getWorkUrl(currentUrl);
  if (!workUrl) {
    window.AO3Popup.createNotifPopup('Cannot get work ID');
    return;
  }

  const popupId = 'ao3-qof-popup';
  document.getElementById(popupId)?.remove();

  async function showSummaryPopup() {
    window.AO3Popup.createNotifPopup(`Getting summary from ${workUrl}...`);

    const data = await window.AO3Extractor.getSummaryFromWork(workUrl, true);
    if (!data) {
      window.AO3Popup.createNotifPopup('Failed to load summary.');
      return;
    }

    const { heading, summary, tags } = data;
    if (!summary) {
      window.AO3Popup.createNotifPopup('No summary found.');
      return;
    }

    const isMobile = window.innerWidth <= 768;

    const content = document.createElement('div');
    content.classList.add('ao3-summary-content');

    const headingEl = document.createElement('div');
    headingEl.classList.add('ao3-summary-heading');
    headingEl.appendChild(window.AO3Popup.parseHtmlFragment(heading));
    content.appendChild(headingEl);

    const summaryEl = document.createElement('div');
    summaryEl.textContent = summary;
    summaryEl.classList.add('ao3-summary-text');
    content.appendChild(summaryEl);

    if (tags && Object.keys(tags).length > 0) {
      for (const [key, values] of Object.entries(tags)) {
        if (values.length === 0) continue;
        const tagContainer = document.createElement('div');
        tagContainer.classList.add('ao3-summary-tags');
        const label = document.createElement('span');
        label.classList.add('ao3-summary-tags-label');
        label.textContent = `${key}: `;
        tagContainer.appendChild(label);
        const valueSpan = document.createElement('span');
        valueSpan.appendChild(window.AO3Popup.parseHtmlFragment(values.join(', ')));
        tagContainer.appendChild(valueSpan);
        content.appendChild(tagContainer);
      }
    }

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      extraClasses: ['summary'],
    });

    document.body.appendChild(popup);
  }

  showSummaryPopup();
})();