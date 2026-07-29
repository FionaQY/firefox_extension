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
    content.style.padding = '0.5em 0';

    const headingEl = document.createElement('div');
    headingEl.style.marginBottom = '0.5em';
    headingEl.style.fontWeight = 'bold';
    headingEl.innerHTML = heading;
    content.appendChild(headingEl);

    const summaryEl = document.createElement('div');
    summaryEl.innerHTML = summary;
    summaryEl.style.marginBottom = '1em';
    content.appendChild(summaryEl);

    if (tags && Object.keys(tags).length > 0) {
      for (const [key, values] of Object.entries(tags)) {
        if (values.length === 0) continue;
        const tagContainer = document.createElement('div');
        tagContainer.style.marginTop = '0.5em';
        const label = document.createElement('span');
        label.style.fontWeight = 'bold';
        label.textContent = `${key}: `;
        tagContainer.appendChild(label);
        const valueSpan = document.createElement('span');
        valueSpan.innerHTML = values.join(', ');
        tagContainer.appendChild(valueSpan);
        content.appendChild(tagContainer);
      }
    }

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      extraStyles: 'max-width: 450px; max-height: 80vh; overflow-y: auto;',
    });

    document.body.appendChild(popup);
  }

  showSummaryPopup();
})();