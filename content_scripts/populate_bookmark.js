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


  async function getBookmarkHtml() {
    const data = await window.AO3Extractor.getSummaryFromWork(workUrl, false);
    if (!data) return '';

    const { heading, summary, tags } = data;
    
    const container = document.createElement('div');
    container.className = 'bookmark-popup';
    container.style.cssText = 'font-family: sans-serif;';
    
    const outerDetails = document.createElement('details');
    const outerSummary = document.createElement('summary');
    outerSummary.style.cssText = 'cursor: pointer; font-weight: bold;';
    outerSummary.innerHTML = 'Summary';
    outerDetails.appendChild(outerSummary);
    
    const headingDiv = document.createElement('div');
    headingDiv.style.cssText = 'white-space: pre-wrap; margin-top: 0.5em;';
    headingDiv.innerHTML = heading;
    outerDetails.appendChild(headingDiv);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = 'white-space: pre-wrap; margin-top: 0.5em;';
    summaryDiv.innerHTML = summary;
    outerDetails.appendChild(summaryDiv);

    if (tags && Object.keys(tags).length > 0) {
      const tagsDetails = document.createElement('details');
      const tagsSummary = document.createElement('summary');
      tagsSummary.style.cssText = 'cursor: pointer; font-weight: bold;';
      tagsSummary.innerHTML = 'Tags';
      tagsDetails.appendChild(tagsSummary);

      for (const [key, value] of Object.entries(tags)) {
        const div = document.createElement('div');
        div.style.cssText = 'font-size: 0.9em; line-height: 1.4; margin-top: 0.5em;';
        div.innerHTML = `${key}(s): ${value.slice(0,3).join(', ')}`;
        tagsDetails.appendChild(div);
      }
      outerDetails.appendChild(tagsDetails);
    }
    container.append(outerDetails);

    return container.outerHTML;
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
    if (!settings['general']['populateBookmark']) {
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