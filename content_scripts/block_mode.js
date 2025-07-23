(() => {
  console.log('AO3 Blocker: Script injected successfully!');
  if (window.hasRun) return;
  window.hasRun = true;

  // const SELECTORS = {
  //   tagLink: 'a[href*="/tags/"][href*="/works"]', // More specific tag matching
  //   workLink: (workId) => `a[href^="/works/${workId}"]` // Exact work matching
  // };

  function superEncodeURI(str) {
    return new URLSearchParams({ text: str }).toString().replace(/^text=/, '');
  }

  const keys = [
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
    'commit',
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

  const filterValueToRegex = {
    'revised_at': 'Updated:',
    'word_count': 'Words',
    'hits': 'Hits',
    'kudos_count': 'Kudos',
    'comments_count': 'Comments',
    'bookmarks_count': 'Bookmarks'
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

  function buildQuery(paramsObj) {
    return Object.entries(paramsObj)
      .filter(([key, _]) => key != 'page')
      .map(([key, value]) => `${key}=${value == null ? '' : value}`)
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
    const text = e.target.text;
    const baseUrl = new URL(e.target.baseURI);

    let searchParams = getParams(baseUrl);
    searchParams = addValue(searchParams, 'work_search[excluded_tag_names]', text);
    searchParams = setValue(searchParams, 'tag_id', extractTagNameFromUrl(decodeURI(e.target.baseURI)));
    
    return {
      url: `https://archiveofourown.org/works?${buildQuery(searchParams)}`,
      page: searchParams['page'],
      filterType: searchParams['work_search[sort_column]']
    };
  }

  function extractRelevantData(workText, filterType) {
    return workText;
  }

  async function handleTagClick(e) {
    if (!e.target.matches('a[href*="/tags/"][href*="/works"]')) return;
    if (clickedOnce) {
      return;
    }
    clickedOnce = true;
    const {url, page, filterType} = getBlockedUrl(e);
    
    console.log("Going to new link: ", url);
    e.preventDefault();
    e.stopImmediatePropagation();

    if (page == '1' || filterType == 'created_at') {
      window.location.href = url;
      return;
    }

    const workText = e.target.offsetParent.innerText;
    const relevantData = extractRelevantData(workText, filterType)

    try {      
      const correctPage = await binarySearchWorks(url, relevantData, filterType, page);
      window.location.href = `${url}&page=${correctPage}`;
      return;
    } catch (error) {
      console.error('AO3 Blocker error:', error);
    }
  }

  async function binarySearchWorks(tagUrl, relevantData, filterType, maxPages = 100) {
    let low = 1, high = maxPages;
    let result = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testUrl = `${tagUrl}?page=${mid}`;
      
      const exists = await checkPageForWork(testUrl, relevantData, filterType);
      exists ? (high = mid - 1, result = mid) : (low = mid + 1);
    }

    return result;
  }

  async function checkPageForWork(url, relevantData, filterType) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      iframe.src = url;
      iframe.onload = () => {
        try {
          // TODO: check if page has work that is updated just before relevant data
          const exists = iframe.contentDocument.querySelector(
            SELECTORS.workLink(workId)
          ) !== null;
          resolve(exists);
        } finally {
          iframe.remove();
        }
      };
      document.body.appendChild(iframe);
    });
  }

  document.addEventListener('click', handleTagClick, { capture: true });
})();
