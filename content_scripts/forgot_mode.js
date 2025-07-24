(() => {
  console.log('AO3 Forgot Script injected successfully!');

  if (window.hasRun) return;
  window.hasRun = true;

  const currentUrl = window.location.href;
  if (!currentUrl.includes('archiveofourown.org/works/')) {
    console.warn('Current page is not an AO3 work page');
    return;
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
          console.log(doc);
          const summary = doc.querySelector('div.summary.module').innerText;
          console.log(summary);

          const tags = [...doc.querySelectorAll('a.tag')].map(x => x.innerText);
          console.log(tags);

          const title = doc.querySelector('h2.title.heading').innerText.trim();
          const author = doc.querySelector('a[rel="author"]').innerText.trim();
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
      background: #2F4F4F;
      color: white;
      border: 2px solid red;
      padding: 1em;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-family: sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #999 #eee;
    `;


    const buttonClose = document.createElement('button');
    buttonClose.textContent = '×';
    buttonClose.style.cssText = `
      position: absolute;
      top: 4px;
      right: 6px;
      background: transparent;
      border: none;
      font-size: 1.2em;
      cursor: pointer;
    `;
    buttonClose.onclick = () => popup.remove();
    popup.appendChild(buttonClose);

    const summaryEl = document.createElement('div');
    summaryEl.innerHTML = `<strong>${heading}:</strong><br>${summary}`;
    popup.appendChild(summaryEl);

    if (tags && Object.keys(tags).length > 0) {
      const tagList = document.createElement('div');
      tagList.style.marginTop = '1em';
      tagList.innerHTML = '<strong>Tags:</strong><ul style="margin:0; padding-left:1.2em;">';
      tagList.innerHTML += `<li>${tags.join(', ')}</li>`;
      tagList.innerHTML += '</ul>';
      popup.appendChild(tagList);
    }

    document.body.appendChild(popup);
  }

  getSummary();
})();
