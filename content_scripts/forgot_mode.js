(() => {
  console.log('AO3 Forgot Script injected successfully!');

  const currentUrl = window.location.href;
  if (!currentUrl.includes('archiveofourown.org/works/')) {
    console.warn('Current page is not an AO3 work page');
    return;
  }
  const popupId = 'ao3-summary-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  function parseUrl(url) {
    if (url.includes('/chapters/')) {
      return url.split('/chapters/', 2)[0];
    } else {
      return url;
    }
  }

  async function getSummaryFromWork(url) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      iframe.src = url;

      iframe.onload = () => {
        try {
          const doc = iframe.contentDocument;
          const summary = doc.querySelector('div.summary.module').innerText;
          const tags = [...doc.querySelectorAll('a.tag')].map(x => `<a href="${x.href}">${x.innerText}</a>`);

          const title = `<a href="${url}">${doc.querySelector('h2.title.heading').innerText.trim()}</a>`;
          const author = doc.querySelector('h3.byline.heading').innerHTML.trim();
          const heading = `${title} by ${author}`
          resolve({ heading, summary, tags });

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
    const workUrl = parseUrl(window.location.href);
    console.log(`Getting summary from ${workUrl}`);
    const { heading, summary, tags } = await getSummaryFromWork(workUrl);

    if (!summary) {
      console.warn('No summary found in other work.');
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

    const buttonClose = document.createElement('button');
    buttonClose.textContent = '×';
    buttonClose.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      font-size: 18px;
      font-weight: bold;
      color: #ccc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
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
      const tagList = document.createElement('div');
      tagList.style.marginTop = '1em';
      tagList.innerHTML = `
        <div style="margin-bottom: 0.25em; font-weight: bold;">Tags:</div>
        <div style="font-size: 0.9em; line-height: 1.4;">${tags.join(', ')}</div>
      `;
      popup.appendChild(tagList);
    }

    document.body.appendChild(popup);
  }

  getSummary();
})();
