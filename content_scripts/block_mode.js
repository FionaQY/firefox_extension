(() => {
  const workUrl = window.AO3UrlParser.getWorkUrl(window.location.href);
  if (workUrl != '') { // if a work page
    window.AO3Popup.createNotifPopup('Cannot block tag on this page');
    return;
  }
  if (typeof window.AO3BlockerHandler === 'function') {
    return;
  }

  const WAITTIME = 4000;
  const AO3Extractor = window.AO3Extractor;
  const AO3UrlParser = window.AO3UrlParser;

  let clickedOnce = false;

  function getBlockedUrl(e) {
    const baseUrl = e.target.baseURI;

    let searchParams = AO3UrlParser.getParams(new URL(baseUrl));
    const blockedTag = e.target.innerText;
    window.AO3Popup.createNotifPopup(`Blocking tag ${blockedTag}...`);
    searchParams = AO3UrlParser.addValue(searchParams, 'work_search[excluded_tag_names]', blockedTag);
    searchParams = AO3UrlParser.addMissingId(searchParams, baseUrl);
    return {
      url: `https://archiveofourown.org/works?${AO3UrlParser.buildQuery(searchParams)}`,
      page: searchParams['page'],
      filterType: searchParams['work_search[sort_column]']
    };
  }

  function blockAuthorUrl(e) {
    const baseUrl = e.target.baseURI;

    let searchParams = AO3UrlParser.getParams(new URL(baseUrl));
    const rawAuthor = e.target.innerText;

    const authorName = rawAuthor.match(/\((.*?)\)/)?.[1] || rawAuthor;
    window.AO3Popup.createNotifPopup(`Blocking author ${authorName}...`);
    
    let currentQuery = AO3UrlParser.getValue(searchParams, 'work_search[query]');
    currentQuery = `${currentQuery.trim()} -creators:${authorName}`;
    searchParams = AO3UrlParser.setValue(searchParams, 'work_search[query]', currentQuery.trim());
    searchParams = AO3UrlParser.addMissingId(searchParams, baseUrl);
    
    return {
      url: `https://archiveofourown.org/works?${AO3UrlParser.buildQuery(searchParams)}`,
      page: searchParams['page'],
      filterType: searchParams['work_search[sort_column]']
    };
  }

  function sleep() {
    return new Promise(resolve => setTimeout(resolve, WAITTIME));
  }

  async function binarySearchWorks(tagUrl, relevantData, filterType, minPages, maxPages = 100) {
    let low = minPages, high = maxPages;
    let result = low;

    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      await sleep();
      const isValidPage = await checkPageForWork(tagUrl, mid, relevantData, filterType);

      if (isValidPage) {
        low = mid + 1;
        result = mid;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }

  async function checkPageForWork(url, page, relevantData, filterType) {
    const currUrl = `${url}&page=${page}`;
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      iframe.src = currUrl;
      iframe.onload = async () => {
        try {
          window.AO3Popup.createNotifPopup(`Checking page ${page}..`);
          const works = iframe.contentDocument.querySelectorAll('.work');
          for (let i = 1; i < works.length; i++) {
            const work = works[i];
            const extractedData = AO3Extractor.extractRelevantData(work, filterType);
            if (AO3Extractor.isValid(relevantData, extractedData)) {
              resolve(true);
              return;
            }
          }
          resolve(false);
        } catch (err) {
          console.error("Iframe loading failed", err);
          resolve(false);
        }finally {
          iframe.remove();
        }
      };
      document.body.appendChild(iframe);
    });
  }

  async function handleTagClick(e) {
    const blockUser = e.target.matches('a[href*="/users/"]');
    if (!e.target.matches('a[href*="/tags/"][href*="/works"]') && !blockUser) {
      console.warn('Did not click a tag/user.');
      window.AO3Popup.createNotifPopup(`You did not click a tag/user...`);
      return;
    };
    if (clickedOnce) {
      console.warn("Clicked once already.");
      return;
    }
    
    const {url, page, filterType} = blockUser ? blockAuthorUrl(e) : getBlockedUrl(e);
    e.preventDefault();
    e.stopImmediatePropagation();
    clickedOnce = true;

    if (filterType == 'created_at') {
      window.location.href = url;
      return;
    }

    const relevantData = AO3Extractor.extractRelevantData(e.target.offsetParent, filterType);
    try {
      let correctPage = page
      if (page != 1) {
        let isValidPage = await checkPageForWork(url, correctPage, relevantData, filterType);
        if (!isValidPage) {
          correctPage = correctPage - 1;
          isValidPage = await checkPageForWork(url, correctPage, relevantData, filterType);
        }

        if (!isValidPage) {
          correctPage = await binarySearchWorks(url, relevantData, filterType, 2, correctPage-1);
        }
      }
      const target = `${url}&page=${correctPage}`;
      
      await sleep();
      browser.runtime.sendMessage({
        action: 'scrollPage',
        targetUrl: target,
        data: {
          filterType: filterType,
          targetValue: JSON.stringify(relevantData)
        }
      });
      window.location.href = target;
      return;
    } catch (error) {
      console.error('AO3 Blocker error:', error);
    }
  }

  window.AO3BlockerHandler = handleTagClick;
  document.addEventListener('click', handleTagClick, { capture: true });
})();
