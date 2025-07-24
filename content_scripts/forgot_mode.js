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
    return url;
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

          const summaryElement = doc.querySelector('.summary blockquote');
          const summary = summaryElement ? summaryElement.textContent.trim() : '';

          // const tags = {
          //   rating: getTagText(doc, 'rating'),
          //   warning: getTagText(doc, 'warning'),
          //   category: getTagText(doc, 'category'),
          //   fandom: getTagText(doc, 'fandom'),
          //   relationship: getTagText(doc, 'relationship'),
          //   character: getTagText(doc, 'character'),
          //   freeform: getTagText(doc, 'freeform'),
          // };

          resolve({ summary, tags });

        } catch (err) {
          console.error('Error parsing work in iframe:', err);
          resolve({ null, null });
        } finally {
          iframe.remove();
        }
      };

      document.body.appendChild(iframe);
    });

    // function getTagText(doc, tagType) {
    //   const selector = `.tags .${tagType} .tag`;
    //   return Array.from(doc.querySelectorAll(selector)).map(el => el.textContent.trim());
    // }
  }


  async function getSummary() {
    const workUrl = parseUrl(window.location.href);
    const { summary, tags } = await getSummaryFromWork(workUrl);

    if (!summary) {
      console.warn('No summary found in other work.');
      return;
    }

    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      color: black;
      border: 2px solid red;
      padding: 1em;
      max-width: 300px;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-family: sans-serif;
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
    summaryEl.innerHTML = `<strong>Other Work Summary:</strong><br>${summary}`;
    popup.appendChild(summaryEl);

    if (tags && Object.keys(tags).length > 0) {
      const tagList = document.createElement('div');
      tagList.style.marginTop = '1em';
      tagList.innerHTML = '<strong>Tags:</strong><ul style="margin:0; padding-left:1.2em;">';
      for (const [type, tagArray] of Object.entries(tags)) {
        if (tagArray.length > 0) {
          tagList.innerHTML += `<li><em>${type}:</em> ${tagArray.join(', ')}</li>`;
        }
      }
      tagList.innerHTML += '</ul>';
      popup.appendChild(tagList);
    }

    document.body.appendChild(popup);
  }

  getSummary();
})();
