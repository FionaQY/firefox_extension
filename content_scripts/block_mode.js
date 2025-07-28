window.hasRun = false;

(() => {
  if (window.hasRun) return;
  window.hasRun = true;

  console.log('AO3 Blocker: Script injected successfully!');

  const keys = [
    'commit',
    'work_search[sort_column]',
    'work_search[other_tag_names]',
    'work_search[excluded_tag_names]',
    'work_search[crossover]',
    'work_search[complete]',
    'work_search[words_from]',
    'work_search[words_to]',
    'work_search[date_from]',
    'work_search[date_to]',
    'work_search[query]',
    'work_search[language_id]',
    'tag_id',
    'page'
    ];
  
  const defaultValues = {
    'work_search[sort_column]': 'revised_at',
    'work_search[other_tag_names]': '',
    'work_search[excluded_tag_names]': '',
    'work_search[crossover]': '',
    'work_search[complete]': '',
    'work_search[words_from]': '',
    'work_search[words_to]': '',
    'work_search[date_from]': '',
    'work_search[date_to]': '',
    'work_search[query]': '',
    'work_search[language_id]': '',
    'commit': 'Sort and Filter',
    'tag_id': '',
    'page': '1'
  };

  function getParams(baseUrl) {
    const params = baseUrl.searchParams; 
    const searchParams = {};
    
    for (const key of keys) {
      searchParams[key] = params.get(key) ?? defaultValues[key];
    }
    return searchParams
  }

  function setValue(searchParams, key, val) {
    searchParams[key] = val;
    return searchParams
  }

  function addValue(searchParams, key, val) {
    const rawTags = searchParams[key] || '';
    const blockedTags = rawTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    if (!blockedTags.includes(val)) {
      blockedTags.push(val);
    }
    return setValue(searchParams, key, blockedTags.join(","));
  }

  function superEncodeURI(str) {
    return new URLSearchParams({ text: str }).toString().replace(/^text=/, '');
  }

  function buildQuery(paramsObj) {
    return Object.entries(paramsObj)
      .filter(([key, _]) => key != 'page')
      .map(([key, value]) => `${key}=${value == null 
        ? '' : value.includes('&') 
        ? superEncodeURI(value) 
        : value}`)
      .join('&');
  }

  function extractTagNameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      const tagIndex = parts.findIndex(part => part === 'tags') + 1;
      return parts[tagIndex];
    } catch (e) {
      console.error("Error parsing URL:", e);
      return null;
    }
  }

  let clickedOnce = false;

  function getBlockedUrl(e) {
    const baseUrl = new URL(e.target.baseURI);

    let searchParams = getParams(baseUrl);
    
    searchParams = addValue(searchParams, 'work_search[excluded_tag_names]', e.target.innerText);
    if (searchParams['tag_id'] == '') {
      searchParams = setValue(searchParams, 'tag_id', extractTagNameFromUrl(decodeURI(e.target.baseURI)));
    }
    
    return {
      url: `https://archiveofourown.org/works?${buildQuery(searchParams)}`,
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
        } finally {
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

  document.addEventListener('click', handleTagClick, { capture: true });
})();
