(() => {
  console.log('AO3 Bookmark Population injected successfully!');

  const currentUrl = window.location.href;
  const workUrl = window.AO3UrlParser.getWorkUrl(currentUrl);
  if (workUrl == '') {
    console.warn('Current page is not an AO3 work page');
    return;
  }

  function cleanTagList(tags) {
    const cleanedTags = [];

    tags.forEach(tag => {
      const newTags = tag.querySelectorAll('a.tag');
      for (const x of newTags) {
        if (cleanedTags.length < 5) {
          cleanedTags.push(x.innerText)
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
                if (!doc) {
                  console.warn('iframe document not accessible or null');
                  resolve(null);
                  return;
                }

                const summary = Array.from(doc.querySelector('div.summary.module blockquote').querySelectorAll('p')).map(x => x.innerHTML.trim()).join('\n') || '';

                const fandomTags = cleanTagList(doc.querySelectorAll('dd.fandom.tags'));
                const characterTags = cleanTagList(doc.querySelectorAll('dd.character.tags'));
                const freeformTags = cleanTagList(doc.querySelectorAll('dd.freeform.tags'));

                const title = doc.querySelector('h2.title.heading')?.innerText.trim() || '';
                const author = doc.querySelector('h3.byline.heading')?.innerHTML.trim() || '';
                const heading = `${title} by ${author}`;

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
    console.log(`Getting info from ${workUrl}`);
    const data = await getSummaryFromWork(workUrl);
    if (!data) return '';

    const { heading, summary, fandomTags, characterTags, freeformTags } = data;
    return `
    <div class="bookmark-popup" style="font-family: sans-serif;">      
      ${summary.length > 0 ? `
        <details>
          <summary style="cursor: pointer; font-weight: bold;"><strong>Summary</strong> - ${heading}</summary>
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

  async function populateBookmark(e) {
    window.AO3Popup.createNotifPopup("Getting bookmark info...");
    const bookmarkTextBox = document.getElementById("bookmark_notes");
    if (bookmarkTextBox.innerHTML == '') {
      newNotes = await getBookmarkHtml();
      bookmarkTextBox.innerHTML = newNotes;
    } else {
      console.log('Bookmark notes already populated')
    }
  }
  
  async function handleBookmarkClick() {
    const bookmarkButtons = document.querySelectorAll('a.bookmark_form_placement_open');
    if (bookmarkButtons) {
        Array.from(bookmarkButtons).forEach(butt => butt.addEventListener('click', populateBookmark));
    } else {
        console.warn("Bookmark buttons not found.");
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleBookmarkClick, { capture: true });
  } else {
    handleBookmarkClick();
  }
})();