(() => {
  if (typeof window.AO3BookmarkHandler === 'function') {
    return;
  }

  const currentUrl = window.location.href;
  const workUrl = window.AO3UrlParser.getWorkUrl(currentUrl);
  if (workUrl == '') {
    console.warn('Current page is not an AO3 work page. Unable to obtain workUrl');
    return;
  }


  function cleanTagList(tags) {
    const cleanedTags = [];

    tags.forEach(tag => {
      const newTags = tag.querySelectorAll('a.tag');
      for (const x of newTags) {
        if (cleanedTags.length < 5) {
          cleanedTags.push(x.innerText)
        } else {
          break;
        }
      }
    });

    return cleanedTags;
  }
  
  async function getSummaryFromWork(url) {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
        iframe.src = url;

        iframe.onload = () => {
            try {
                const doc = iframe.contentDocument;
                
                const summary = Array.from(doc.querySelector('div.summary.module blockquote').querySelectorAll('p')).map(x => x.innerHTML.trim()).join('\n') || '';

                const fandomTags = cleanTagList(doc.querySelectorAll('dd.fandom.tags'));
                const characterTags = cleanTagList(doc.querySelectorAll('dd.character.tags'));
                const freeformTags = cleanTagList(doc.querySelectorAll('dd.freeform.tags'));

                const tempTitle = doc.querySelector('h2.title.heading')?.innerHTML.trim() || '';
                const title = `<a href="${url}">${tempTitle}</a>`
                const authorHref = Array.from(doc.querySelectorAll('h3.byline.heading a')).map(x => x.href.trim() || '').join(', ') || '';
                const authorRegex = /^\/users\/([^\/]+)/;
                const match = authorHref.match(authorRegex);
                const authorName = match ? ` by ${match[1]}` : '';
                const heading = `${title}${authorName}`

                resolve({ heading, summary, fandomTags, characterTags, freeformTags});
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

  async function getBookmarkHtml() {
    const data = await getSummaryFromWork(workUrl);
    if (!data) return '';

    const { heading, summary, fandomTags, characterTags, freeformTags } = data;
    return `
    <div class="bookmark-popup" style="font-family: sans-serif;">      
      ${summary.length > 0 ? `
        <details>
          <summary style="cursor: pointer; font-weight: bold;"><strong>Summary</strong></summary>
          <div style="white-space: pre-wrap; margin-top: 0.5em;">${heading}</div>
          <div style="white-space: pre-wrap; margin-top: 0.5em;">${summary}</div>
        </details>
          ` : ''
        }

      ${fandomTags.length == 0 && characterTags.length == 0 && freeformTags.length == 0 ? 
        ''
        :
        `
        <details>
          <summary style="cursor: pointer; font-weight: bold;"><strong>Tags</strong></summary>
          ${fandomTags.length == 0 
            ? ''
            : `<div style="font-size: 0.9em; line-height: 1.4; margin-top: 0.5em;"><strong>Fandom(s):</strong> ${fandomTags.join(', ')}\n</div>`
          }
          ${characterTags.length == 0 
            ? ''
            : `<div style="font-size: 0.9em; line-height: 1.4; margin-top: 0.5em;"><strong>Character(s):</strong> ${characterTags.join(', ')}\n</div>`
          }
          ${freeformTags.length == 0 
            ? ''
            : `<div style="font-size: 0.9em; line-height: 1.4; margin-top: 0.5em;"><strong>Other Tag(s):</strong> ${freeformTags.join(', ')}\n</div>`
          }
          </details>`
      }
      
    </div>
    `;
  }

  function isVisible() {
    const bookmarkForm = document.getElementById("bookmark_form_placement");
    if (!bookmarkForm || bookmarkForm.style.display == 'none') {
      return false;
    }
    return true;
  }

  async function populateBookmark() {
    const { settings = {} } = await browser.storage.local.get('settings');
    if (!settings['populateBookmark']) {
      return;
    }

    const bookmarkTextBox = document.getElementById("bookmark_notes");
    if (bookmarkTextBox.value.trim().length === 0) {
      window.AO3Popup.createNotifPopup("Getting bookmark info...");
      bookmarkTextBox.value = await getBookmarkHtml();
      window.AO3Popup.createNotifPopup("Bookmark textbox populated.");
    } else {
      window.AO3Popup.createNotifPopup("No population as textbox is already populated");
    }
  }
  
  async function handleBookmarkClick() {
    if (handleBookmarkClick.listenerAdded) return;
    
    document.addEventListener('click', e => {
      if (e.target.matches('a.bookmark_form_placement_open') && isVisible()) {
        populateBookmark();
      }
    });
    handleBookmarkClick.listenerAdded = true;
  }

  window.AO3BookmarkHandler = handleBookmarkClick;
  handleBookmarkClick();
})();