(() => {
  if (typeof window.AO3BlockerHandler === 'function') {
    console.log('Block Script already ran, exiting');
    return;
  }

  console.log('AO3 Blocker: Script injected successfully!');
  const WAITTIME = 5000;
  const AO3Extractor = window.AO3Extractor;
  const AO3Parser = window.AO3Parser;

  let clickedOnce = false;

  function getBlockedUrl(e) {
    const baseUrl = e.target.baseURI;

    let searchParams = AO3Parser.getParams(new URL(baseUrl));
    searchParams = AO3Parser.addValue(searchParams, 'work_search[excluded_tag_names]', e.target.innerText);
    searchParams = AO3Parser.addTagId(searchParams, baseUrl);
    
    return {
      url: `https://archiveofourown.org/works?${AO3Parser.buildQuery(searchParams)}`,
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
      await sleep(WAITTIME);
      const isValidPage = await checkPageForWork(testUrl, relevantData, filterType);

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
            const extractedData = AO3Extractor.extractRelevantData(work.textContent, filterType);
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

    if (filterType == 'created_at') {
      console.log("Going to new link: ", url);
      window.location.href = `${url}&page=1`;
      return;
    }

    const relevantData = AO3Extractor.extractRelevantData(e.target.offsetParent.innerText, filterType);
    try {
      let correctPage = page
      if (page != 1) {
        const isValidPage = await checkPageForWork(`${url}&page=${page}`, relevantData, filterType);
        if (!isValidPage) {
          correctPage = await binarySearchWorks(url, relevantData, filterType, page-1);
        }
      }
      const target = `${url}&page=${correctPage}`;
      
      await sleep(WAITTIME);
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
