(() => {
  const currentUrl = window.location.href;
  const workUrl = window.AO3UrlParser.getWorkUrl(currentUrl);
  if (workUrl != '') { // if a work page
    window.AO3Popup.createNotifPopup('Cannot apply filters on this page');
    return;
  }
  const AO3UrlParser = window.AO3UrlParser;
  const AO3Extractor = window.AO3Extractor;
  
  function getStorageValue(filters, key) {
    return filters[key] || '';
  }

  function getStorageList(filters, key) {
    const obtainedList = getStorageValue(filters, key);
    if (obtainedList.length == 0) {
      return [];
    }
    return obtainedList.split(',').map(x => x.trim()).filter(x => x.length > 0);
  }


  function getLangAbb(lang) {
    const normalized = lang.toLowerCase().trim().replace(/[^\w\s]/g, '');
    if (/^[a-z]{2,3}(-[a-z]{2,3})?$/i.test(normalized)) {
      return normalized;
    }
    if (languageCodeMap[normalized]) {
      return languageCodeMap[normalized];
    }
    console.warn(`Unrecognized language: "${lang}"`);
    return '';
  }

  function parseQuery(query) {
    if (!query || !query.trim()) return [];
    let cleanedQuery = query.replace(/:\s+/g, ":");
    cleanedQuery = cleanedQuery.replace(/\s+/g, ' ');

    const tokens = [];
    let curr = '';
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < cleanedQuery.length; i++) {
      const char = cleanedQuery[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        curr += char;
        continue;
      }

      if (inQuotes) {
        if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
        }
        curr += char;
        continue;
      }

      if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === ' ' && parenDepth === 0 && !inQuotes) {
        if (curr.trim()) {
          tokens.push(curr.trim());
          curr = '';
        }
        continue;
      }
      curr += char;
    }
    if (curr.trim()) tokens.push(curr.trim());
    return tokens;
  }

  function replaceQueryWithPref(pref, queries, val, append) {
    if (!val || !val.trim()) {
      return queries;
    }
    for (let i = queries.length - 1; i >= 0; i--) {
      if (queries[i].startsWith(pref)) {
        if (append) {
          queries[i] = `${queries[i]} OR ${val}`;
        } else {
          queries[i] = val;
        }
        return queries;
      }
    }
    queries.push(val);
    return queries;
  }

  function getQueryString(filters, initialQuery) {
    let queries = parseQuery(initialQuery);
    const [langPref, exLangPref, exCreatorPref, chapPref, expChapPref] = [
      'language_id', '-language_id', '-creators', 'major_version', 'expected_number_of_chapters'
    ];

    const [queryStr, languagesRaw, excluLanguagesRaw, excludedCreatorsRaw, chapterNumRaw, expectedChaptersRaw] = [
      getStorageValue(filters, 'query'),
      getStorageList(filters, langPref),
      getStorageList(filters, exLangPref),
      getStorageList(filters, exCreatorPref),
      getStorageValue(filters, chapPref),
      getStorageValue(filters, expChapPref),
    ];

    // process queryStr
    const tokens = parseQuery(queryStr);
    for (let token of tokens) {
      if (token && !queries.includes(token)) {
        queries.push(token);
      }
    }

    // languagesList
    const languagesList = languagesRaw
      .map(x => AO3Extractor.getLangAbb(x))
      .filter(code => code.trim().length != 0)
      .map(code => `${langPref}:${code}`)
      .filter(entry => !queries.includes(entry))
    const languages = languagesList.join(' OR ');
    queries = replaceQueryWithPref(langPref, queries, languages, true);

    // excluLanguagesList
    const excluLanguagesList = excluLanguagesRaw
      .map(x => AO3Extractor.getLangAbb(x))
      .filter(code => code.trim().length != 0)
      .map(x => `${exLangPref}:${x}`)
      .filter(x => !queries.includes(x));
    const excluLanguages = excluLanguagesList.join(' ');
    if (excluLanguages) queries.push(excluLanguages);

    // excludedCreators
    const excludedCreators = excludedCreatorsRaw
      .map(x => `${exCreatorPref}:${x}`)
      .filter(x => !queries.includes(x))
      .join(' ');
    if (excludedCreators) queries.push(excludedCreators);

    // current number of chapters
    if (chapterNumRaw) {
      const chapterNums = `${chapPref}:${chapterNumRaw}`;
      queries = replaceQueryWithPref(chapPref, queries, chapterNums, false);
    }
    
    // total number of chapters
    if (expectedChaptersRaw) {
      const expectedChapters = `${expChapPref}:${expectedChaptersRaw}`;
      queries = replaceQueryWithPref(expChapPref, queries, expectedChapters, false);
    }

    return queries.join(' ');
  }

  function setSearchParams(filters, searchParams) {
    const justSet = ['sort_column', 'crossover', 'complete', 'date_from', 'date_to', 'words_from', 'words_to'];
    for (const opt of justSet) {
      const value = getStorageValue(filters, opt);
      if (value.length != 0) {
        const trueValue = value == 'all' ? '' : value;
        searchParams = AO3UrlParser.setValue(searchParams, `work_search[${opt}]`, trueValue);
      }
    }
    return searchParams;
  }

  async function formParams(baseUrl, isBookmark) {
    const { filters = {} } = await browser.storage.local.get('filters');
    let searchParams = isBookmark
      ? AO3UrlParser.getBookmarkParams(new URL(baseUrl)) 
      : AO3UrlParser.getParams(new URL(baseUrl));
    if (!isBookmark) searchParams = setSearchParams(filters, searchParams);

    const searchPrefix = isBookmark ? 'bookmark_search' : 'work_search';

    // append tags
    const excluTagName = 'excluded_tag_names';
    const excludedTags = getStorageList(filters, excluTagName);
    for (const tag of excludedTags) {
      searchParams = AO3UrlParser.addValue(searchParams, `${searchPrefix}[${excluTagName}]`, tag);
    }

    const incluTagName = 'other_tag_names';
    const includedTags = getStorageList(filters, incluTagName);
    for (const tag of includedTags) {
      searchParams = AO3UrlParser.addValue(searchParams, `${searchPrefix}[${excluTagName}]`, tag);
    }
    
    // set tag id
    searchParams = AO3UrlParser.addMissingId(searchParams, baseUrl);
    const queryKey = isBookmark ? 'bookmark_search[bookmarkable_query]' : 'work_search[query]';
    const initialQuery = AO3UrlParser.getValue(searchParams, queryKey);
    searchParams = AO3UrlParser.setValue(
      searchParams,
      queryKey,
      getQueryString(filters, initialQuery));
    return searchParams;
  }

  async function applyFilters() {
    window.AO3Popup.createNotifPopup("Applying filters now...");
    const baseUrl = window.location.href;
    const isBookmark = baseUrl.includes("/bookmarks");

    const params = await formParams(baseUrl, isBookmark);
    const tempWord = isBookmark ? 'bookmarks' : 'works';
    const newUrl = `https://archiveofourown.org/${tempWord}?${AO3UrlParser.buildQuery(params)}`
    window.location.href = newUrl;
    return;
  }

  applyFilters();
})();
