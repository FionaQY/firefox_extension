window.hasRun = false;
(() => {
  if (window.hasRun) return;
  window.hasRun = true;

  console.log('AO3 Apply Script injected successfully!');
  
  const justSet = ['sort_column', 'crossover', 'complete', 'words_from', 'words_to', 'date_from', 'date_to']

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
  
  async function getValue(key) {
    const res = await browser.storage.local.get(key);
    return res[key] ? res[key].trim() : '';
  }

  function getParams(baseUrl) {
    const params = baseUrl.searchParams; 
    const searchParams = {};
    
    for (const key of keys) {
      searchParams[key] = params.get(key) ?? defaultValues[key];
    }
    return searchParams
  }

  function setParamValue(searchParams, key, val) {
    searchParams[key] = val;
    return searchParams
  }

  function addValue(searchParams, key, val) {
    const valueToAdd = val.trim();
    const rawTags = searchParams[key] || '';
    const blockedTags = rawTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    if (!blockedTags.includes(valueToAdd)) {
      blockedTags.push(valueToAdd);
    }
    return setParamValue(searchParams, key, blockedTags.join(","));
  }

  function getLangAbb(lang) {
    return lang;
  }

  async function getQueryString() {
    let queries = [];
    
    const queryStr = await getValue('query');
    if (queryStr) queries.push(queryStr);

    const languages = await getValue('includedLanguage');
    if (languages.length != 0) {
      queries.push(languages.split(',').map(x => `language_id:${getLangAbb(x)}`).join(' OR '));
    }

    const excluLanguages = await getValue('excludedLanguage');
    if (excluLanguages.length != 0) {
      queries.push(excluLanguages.split(',').map(x => `-language_id:${getLangAbb(x)}`).join(' '));
    }

    const isSingleChapter = await getValue('isSingleChapter');
    if (isSingleChapter) queries.push(isSingleChapter);

    const excludedCreators = await getValue('excludedCreators');
    if (excludedCreators.length != 0) {
      queries.push(excludedCreators.split(',').map(x => `-creators:${getLangAbb(x)}`).join(' '));
    }

    return queries.join(' ');
  } 

  async function justSetVals(searchParams) {
    for (const opt of justSet) {
      const value = await getValue(opt);
      searchParams = setParamValue(searchParams, `work_search[${opt}]`, value);
    }
    return searchParams;
  }

  async function formParams() {
    const baseUrl = window.location.href;

    let searchParams = getParams(new URL(baseUrl));
    searchParams = await justSetVals(searchParams);

    const excludedTags = (await getValue('excluded_tag_names')).split(',');
    for (const tag of excludedTags) {
      searchParams = addValue(searchParams, 'work_search[excluded_tag_names]', tag);
    }

    const includedTags = (await getValue('other_tag_names')).split(',');
    for (const tag of includedTags) {
      searchParams = addValue(searchParams, 'work_search[other_tag_names]', tag);
    }
    
    if (searchParams['tag_id'] == '') {
      searchParams = setParamValue(searchParams, 'tag_id', extractTagNameFromUrl(decodeURI(baseUrl)));
    }
    
    searchParams = setParamValue(searchParams, 'work_search[query]' , await getQueryString());
    
    return searchParams;
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

  function buildQuery(paramsObj) {
    return Object.entries(paramsObj)
      .filter(([key, _]) => key != 'page')
      .map(([key, value]) => `${key}=${value == null 
        ? '' : value.includes('&') 
        ? superEncodeURI(value) 
        : value}`)
      .join('&');
  }

  async function applyFilters() {
    const params = await formParams();
    const newUrl = `https://archiveofourown.org/works?${buildQuery(params)}`
    console.log(`Going to url: ${newUrl}`);
    window.location.href = newUrl;
    return;
  }

  applyFilters();
})();
