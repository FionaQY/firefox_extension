(() => {
  if (typeof window.AO3ApplyHandler === 'function') {
    console.log('Apply Script already ran, exiting');
    return;
  }

  console.log('AO3 Apply Script injected successfully!');
    
  async function getStorageValue(key) {
    const res = await browser.storage.local.get(key);
    return res[key] ? res[key].trim() : '';
  }

  async function getStorageList(key) {
    const obtainedList = await getStorageValue(key);
    if (obtainedList.length == 0) {
      return [];
    }
    return obtainedList.split(',').map(x => x.trim()).filter(x => x.length > 0);
  }


  function getLangAbb(lang) {
    return lang;
  }

  async function getQueryString() {
    let queries = [];
    
    const queryStr = await getStorageValue('query');
    if (queryStr) queries.push(queryStr);

    const languages = (await getStorageList('includedLanguage')).map(x => `language_id:${getLangAbb(x)}`).join(' OR ');
    if (languages) queries.push(languages);

    const excluLanguages = (await getStorageList('excludedLanguage')).map(x => `-language_id:${getLangAbb(x)}`).join(' ');
    if (excluLanguages) queries.push(excluLanguages);

    const isSingleChapter = await getStorageValue('isSingleChapter');
    if (isSingleChapter) queries.push(isSingleChapter);

    const excludedCreators = (await getStorageList('excludedCreators')).map(x => `-creators:${x}`).join(' ');
    if (excludedCreators) queries.push(excludedCreators);

    return queries.join(' ');
  } 

  async function justSetVals(searchParams) {
    const justSet = ['sort_column', 'crossover', 'complete', 'words_from', 'words_to', 'date_from', 'date_to']
    for (const opt of justSet) {
      const value = await getStorageValue(opt);
      searchParams = window.AO3Parser.setValue(searchParams, `work_search[${opt}]`, value);
    }
    return searchParams;
  }

  async function formParams() {
    const baseUrl = window.location.href;
    let searchParams = window.AO3Parser.getParams(new URL(baseUrl));
    searchParams = await justSetVals(searchParams);

    const excludedTags = await getStorageList('excluded_tag_names');
    for (const tag of excludedTags) {
      searchParams = window.AO3Parser.addValue(searchParams, 'work_search[excluded_tag_names]', tag);
    }

    const includedTags = await getStorageList('other_tag_names');
    for (const tag of includedTags) {
      searchParams = window.AO3Parser.addValue(searchParams, 'work_search[other_tag_names]', tag);
    }
    
    if (searchParams['tag_id'] == '') {
      searchParams = window.AO3Parser.addTagId(searchParams, baseUrl);
    }
    
    searchParams = window.AO3Parser.setValue(searchParams, 'work_search[query]' , await getQueryString());
    return searchParams;
  }

  async function applyFilters() {
    const params = await formParams();
    const newUrl = `https://archiveofourown.org/works?${window.AO3Parser.buildQuery(params)}`
    console.log(`Going to url: ${newUrl}`);
    window.location.href = newUrl;
    return;
  }

  window.AO3ApplyHandler = applyFilters;
  applyFilters();
})();
