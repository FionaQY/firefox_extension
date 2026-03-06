(() => {
  const currentUrl = window.location.href;
  const workUrl = window.AO3UrlParser.getWorkUrl(currentUrl);
  if (workUrl == '') {
    window.AO3Popup.createNotifPopup('Cannot get work ID');
    return;
  }
  const popupId = 'ao3-summary-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  async function getSummaryFromWork(url) {
    const { settings = {} } = await browser.storage.local.get('settings');
    if (!settings['general']['summaryNoWifi']) {
      resolve(window.AO3Extractor.getTags(document, url));
    }

    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      iframe.src = url;

      iframe.onload = () => {
        try {
          const doc = iframe.contentDocument;

          resolve(window.AO3Extractor.getTags(doc, url));

        } catch (err) {
          console.error('Error parsing work in iframe:', err);
          resolve(null);
        } finally {
          iframe.remove();
        }
      };

      document.body.appendChild(iframe);
    });
  }

  async function getSummary() {
    window.AO3Popup.createNotifPopup(`Getting summary from ${workUrl}...`);
    const data = await window.AO3Extractor.getSummaryFromWork(workUrl, true);
    if (!data) return '';

    const { heading, summary, tags } = data;

    if (!summary) {
      window.AO3Popup.createNotifPopup('No summary found.');
      return;
    }

    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e1e2f;
      color: #eee;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 1em;
      max-width: 450px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      font-family: sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #555 #2e2e3e;
    `;
    popup.id = popupId;
    const isMobile = window.innerWidth <= 768;

    const buttonClose = document.createElement('button');
    buttonClose.textContent = '×';
    buttonClose.style.cssText = `
      position: absolute;
      top: ${isMobile ? '12px' : '8px'};
      right: ${isMobile ? '12px' : '8px'};
      width: ${isMobile ? '32px' : '24px'};
      height: ${isMobile ? '32px' : '24px'};
      background: none;
      border:none;
      font-size: ${isMobile ? '24px' : '18px'};
      font-weight: bold;
      color: #ccc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10000;
    `;
    buttonClose.addEventListener('mouseenter', () => {
      buttonClose.style.background = 'rgba(255, 255, 255, 0.2)';
      buttonClose.style.color = '#fff';
    });

    buttonClose.addEventListener('mouseleave', () => {
      buttonClose.style.background = 'rgba(255, 255, 255, 0.1)';
      buttonClose.style.color = '#ccc';
    });
    
    buttonClose.onclick = () => popup.remove();
    popup.appendChild(buttonClose);

    const summaryEl = document.createElement('div');
    summaryEl.innerHTML = `<div style="margin-bottom: 0.5em; font-weight: bold;">${heading}</div><div>${summary}</div>`;
    popup.appendChild(summaryEl);

    if (tags && Object.keys(tags).length > 0) {
      for (const [key, value] of Object.entries(tags)) {
        const tagList = document.createElement('div');
        tagList.style.marginTop = '1em';
        tagList.innerHTML = `
          <div style="margin-bottom: 0.25em; font-weight: bold;">${key}:</div>
          <div style="font-size: 0.9em; line-height: 1.4;">${value.join(', ')}</div>
        `;
        popup.appendChild(tagList);
      }
    }

    document.body.appendChild(popup);
  }

  getSummary();
})();
