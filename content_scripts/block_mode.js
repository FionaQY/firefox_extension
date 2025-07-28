(() => {
  if (typeof window.AO3BlockerHandler === 'function') {
    console.log('Block Script already ran, exiting');
    return;
  }

  console.log('AO3 Blocker: Script injected successfully!');

  let clickedOnce = false;

  function getBlockedUrl(e) {
    const baseUrl = e.target.baseURI;

    let searchParams = window.AO3Parser.getParams(new URL(baseUrl));
    searchParams = window.AO3Parser.addValue(searchParams, 'work_search[excluded_tag_names]', e.target.innerText);
    if (searchParams['tag_id'] == '') {
      searchParams = window.AO3Parser.addTagId(searchParams, baseUrl);
    }
    
    return {
      url: `https://archiveofourown.org/works?${window.AO3Parser.buildQuery(searchParams)}`,
      page: searchParams['page'],
      filterType: searchParams['work_search[sort_column]']
    };
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function binarySearchWorks(tagUrl, relevantData, filterType, maxPages = 100) {
    let low = 1, high = maxPages;
    let result = 1;

    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      const testUrl = `${tagUrl}&page=${mid}`;
      console.log(`Checking page ${mid}`);
      const isValidPage = await checkPageForWork(testUrl, relevantData, filterType);
      await sleep(5000);

      if (isValidPage) {
        low = mid + 1;
        result = mid;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }

  async function checkPageForWork(url, relevantData, filterType) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      iframe.src = url;
      iframe.onload = async () => {
        try {
          const works = iframe.contentDocument.querySelectorAll('.work');
          for (let i = 1; i < works.length; i++) {
            const work = works[i];
            const extractedData = window.AO3Blocker.extractRelevantData(work.textContent, filterType);
            if (window.AO3Blocker.isValid(relevantData, extractedData)) {
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
    if (!e.target.matches('a[href*="/tags/"][href*="/works"]')) {
      console.warn('Did not click a tag.');
      return;
    };
    if (clickedOnce) {
      console.warn("Clicked once already.");
      return;
    }
    
    const {url, page, filterType} = getBlockedUrl(e);
    e.preventDefault();
    e.stopImmediatePropagation();
    clickedOnce = true;

    if (page == '1' || filterType == 'created_at') {
      console.log("Going to new link: ", url);
      window.location.href = url;
      return;
    }

    const relevantData = window.AO3Blocker.extractRelevantData(e.target.offsetParent.innerText, filterType);
    try {      
      const correctPage = await binarySearchWorks(url, relevantData, filterType, page);
      const target = `${url}&page=${correctPage}`;
      
      await sleep(5000);

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
