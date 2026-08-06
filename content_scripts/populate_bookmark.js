/* globals browser */
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

  async function getBookmarkHtml() {
    const data = await window.AO3Extractor.getSummaryFromWork(workUrl, false);
    if (!data) return '';

    const { heading, summary, tags } = data;
    
    const container = document.createElement('div');
    container.className = 'bookmark-popup';
    
    const outerDetails = document.createElement('details');
    const outerSummary = document.createElement('summary');
    outerSummary.className = 'bookmark-summary-toggle';
    outerDetails.appendChild(outerSummary);
    
    const headingDiv = document.createElement('div');
    headingDiv.className = 'bookmark-heading';
    headingDiv.appendChild(window.AO3Popup.parseHtmlFragment(heading));
    outerDetails.appendChild(headingDiv);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'bookmark-summary';
    summaryDiv.textContent = summary;
    outerDetails.appendChild(summaryDiv);

    if (tags && Object.keys(tags).length > 0) {
      const tagsDetails = document.createElement('details');
      const tagsSummary = document.createElement('summary');
      tagsSummary.className = 'bookmark-summary-toggle';
      tagsSummary.textContent = 'Tags';
      tagsDetails.appendChild(tagsSummary);

      for (const [key, value] of Object.entries(tags)) {
        const div = document.createElement('div');
        div.className = 'bookmark-tag-item';
        div.textContent = `${key}(s): ${value.slice(0,3).join(', ')}`;
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