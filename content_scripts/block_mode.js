(() => {
  console.log('AO3 Blocker: Script injected successfully!');
  if (window.hasRun) return;
  window.hasRun = true;

  // AO3-specific CSS selectors
  const SELECTORS = {
    tagLink: 'a[href*="/tags/"][href*="/works"]', // More specific tag matching
    workLink: (workId) => `a[href^="/works/${workId}"]` // Exact work matching
  };

  // Extract AO3 work ID from URL
  function getWorkId(url) {
    const match = url.match(/\/works\/(\d+)/);
    return match ? match[1] : null;
  }

  function superEncodeURI(str) {
    return new URLSearchParams({ text: str }).toString().replace(/^text=/, '');
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

  function buildAO3Query(paramsObj) {
    return Object.entries(paramsObj)
      .map(([key, value]) => `${key}=${value == null ? '' : value}`)
      .join('&');
  }


  let clickedOnce = false;

  async function handleTagClick(e) {
    if (clickedOnce) {
      return;
    }

    const work = e.target.offsetParent.innerText;
    const text = e.target.text;
    const baseUrl = decodeURI(e.target.baseURI);
    console.log("baseUrl: ", baseUrl);

    const workText = e.target.textContent.trim();

    const testbaseUrl = new URL(e.target.baseURI);
    const params = testbaseUrl.searchParams;     
    console.log(params.get("work_search[excluded_tag_names]"));

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
      'tag_id'
    ];

    const searchParams = {};

    for (const key of keys) {
      searchParams[key] = params.get(key) || '';
    }

    searchParams['work_search[sort_column]'] = 'revised_at'; // force override
    searchParams['commit'] = 'Sort and Filter';
    const rawTags = searchParams['work_search[excluded_tag_names]'] || '';
    const blockedTags = rawTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    blockedTags.push(text);
    searchParams['work_search[excluded_tag_names]'] = blockedTags.join(",");
    console.log(blockedTags);

    console.log("https://archiveofourown.org/works?", buildAO3Query(searchParams));
    const newStr = "https://archiveofourown.org/works?" + buildAO3Query(searchParams);

    
    // const parts = baseUrl.split("&work_search[crossover]=", 2); 
    // console.log(parts);
    // var newStr = parts[0];
    // if (parts.length != 2) {
    //   newStr = "https://archiveofourown.org/works?work_search[sort_column]=revised_at&work_search[other_tag_names]=&work_search[excluded_tag_names]=" + text + "&work_search[crossover]=&work_search[complete]=&work_search[words_from]=&work_search[words_to]=&work_search[date_from]=&work_search[date_to]=&work_search[query]=&work_search[language_id]=&commit=Sort and Filter&tag_id=" + decodeURI(extractTagNameFromUrl(baseUrl));
    // } else if (newStr[newStr.length - 1] != "=") {
    //   newStr = newStr + "," + superEncodeURI(text) + "&work_search[crossover]=" + parts[1];
    // } else {
    //   newStr = newStr + superEncodeURI(text) + "&work_search[crossover]=" + parts[1];
    // }
    
    console.log(newStr);
    e.preventDefault();
    clickedOnce = true;
    
    e.stopImmediatePropagation();

    window.location.href = `${newStr}`;
    // window.open(`${newStr}&page=${1}`, '_blank');
    return;
    
    e.preventDefault();
    clickedOnce = true;
    
    e.stopImmediatePropagation();

    const currentWorkUrl = window.location.href;
    const workId = getWorkId(currentWorkUrl);
    if (!workId) return;

    try {
      const tagUrl = new URL(tagLink.href);
      tagUrl.searchParams.delete('page'); // Clean URL
      
      const correctPage = await binarySearchWorks(tagUrl.toString(), workId);
      window.open(`${tagUrl}?page=${correctPage}`, '_blank');
    } catch (error) {
      console.error('AO3 Blocker error:', error);
    }
  }

  // Binary search implementation
  async function binarySearchWorks(tagUrl, workId, maxPages = 100) {
    let low = 1, high = maxPages;
    let result = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testUrl = `${tagUrl}?page=${mid}`;
      
      const exists = await checkPageForWork(testUrl, workId);
      exists ? (high = mid - 1, result = mid) : (low = mid + 1);
    }

    return result;
  }

  // Check if work exists on page
  async function checkPageForWork(url, workId) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      iframe.src = url;
      iframe.onload = () => {
        try {
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

  // Initialize
  document.addEventListener('click', handleTagClick, { capture: true });
})();

/** <option value="title_to_sort_on">Title</option>
<option value="created_at">Date Posted</option>
<option selected="selected" value="revised_at">Date Updated</option>
<option value="word_count">Word Count</option>
<option value="hits">Hits</option>
<option value="kudos_count">Kudos</option>
<option value="comments_count">Comments</option>
<option value="bookmarks_count">Bookmarks</option></select>
**/