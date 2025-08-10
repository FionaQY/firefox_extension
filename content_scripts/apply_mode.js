(() => {
  const AO3UrlParser = window.AO3UrlParser;

  const languageCodeMap = {'english': 'en','español': 'es', 'spanish': 'es','français': 'fr','french': 'fr','deutsch': 'de','german': 'de',
    'italiano': 'it','italian': 'it','português': 'pt','portuguese': 'pt','中文': 'zh','chinese': 'zh','日本語': 'ja','japanese': 'ja',
    '한국어': 'ko','korean': 'ko','русский': 'ru','russian': 'ru','polski': 'pl','polish': 'pl','nederlands': 'nl','dutch': 'nl',
    'svenska': 'sv','swedish': 'sv','norsk': 'no','norwegian': 'no','dansk': 'da','danish': 'da','suomi': 'fi','finnish': 'fi',
    'čeština': 'cs','czech': 'cs','magyar': 'hu','hungarian': 'hu','türkçe': 'tr','turkish': 'tr','العربية': 'ar','arabic': 'ar',
    'עברית': 'he','hebrew': 'he','ελληνικά': 'el','greek': 'el','bahasa indonesia': 'id','indonesian': 'id','ไทย': 'th','thai': 'th',
    'việt nam': 'vi','vietnamese': 'vi','հայերեն': 'hy','armenian': 'hy','bosanski': 'bs','bosnian': 'bs','български': 'bg','bulgarian': 'bg',
    'català': 'ca','catalan': 'ca','hrvatski': 'hr','croatian': 'hr','esperanto': 'eo','eesti': 'et','estonian': 'et','gaeilge': 'ga','irish': 'ga',
    'íslenska': 'is','icelandic': 'is','lietuvių': 'lt','lithuanian': 'lt','latviešu': 'lv','latvian': 'lv','македонски': 'mk','macedonian': 'mk',
    'bahasa melayu': 'ms','malay': 'ms','română': 'ro','romanian': 'ro','slovenčina': 'sk','slovak': 'sk','slovenščina': 'sl','slovenian': 'sl',
    'српски': 'sr','serbian': 'sr','українська': 'uk','ukrainian': 'uk','afrikaans': 'af','shqip': 'sq','albanian': 'sq','euskera': 'eu','basque': 'eu',
    'беларуская': 'be','belarusian': 'be','বাংলা': 'bn','bengali': 'bn','ქართული': 'ka','georgian': 'ka','ગુજરાતી': 'gu','gujarati': 'gu',
    'हिन्दी': 'hi','hindi': 'hi','latin': 'la','മലയാളം': 'ml','malayalam': 'ml','मराठी': 'mr','marathi': 'mr','नेपाली': 'ne','nepali': 'ne',
    'ਪੰਜਾਬੀ': 'pa','punjabi': 'pa','سنڌي': 'sd','sindhi': 'sd','සිංහල': 'si','sinhala': 'si','தமிழ்': 'ta','tamil': 'ta','తెలుగు': 'te','telugu': 'te',
    'اردو': 'ur','urdu': 'ur','cymraeg': 'cy','welsh': 'cy','gaelic': 'gd','scottish gaelic': 'gd','yiddish': 'yi',
  };
  
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
      .map(x => getLangAbb(x))
      .filter(code => code.trim().length != 0)
      .map(code => `${langPref}:${code}`)
      .filter(entry => !queries.includes(entry))
    const languages = languagesList.join(' OR ');
    queries = replaceQueryWithPref(langPref, queries, languages, true);

    // excluLanguagesList
    const excluLanguagesList = excluLanguagesRaw
      .map(x => getLangAbb(x))
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

  function justSearchParams(filters, searchParams) {
    const justSet = ['sort_column', 'crossover', 'complete', 'date_from', 'date_to', 'words_from', 'words_to'];
    for (const opt of justSet) {
      const value = getStorageValue(filters, opt);
      searchParams = AO3UrlParser.setValue(searchParams, `work_search[${opt}]`, value);
    }
    return searchParams;
  }

  async function formParams() {
    const { filters = {} } = await browser.storage.local.get('filters');
    const baseUrl = window.location.href;
    let searchParams = AO3UrlParser.getParams(new URL(baseUrl));
    searchParams = justSearchParams(filters, searchParams);

    // append tags
    const excluTagName = 'excluded_tag_names';
    const excludedTags = getStorageList(filters, excluTagName);
    for (const tag of excludedTags) {
      searchParams = AO3UrlParser.addValue(searchParams, `work_search[${excluTagName}]`, tag);
    }

    const incluTagName = 'other_tag_names';
    const includedTags = getStorageList(filters, incluTagName);
    for (const tag of includedTags) {
      searchParams = AO3UrlParser.addValue(searchParams, `work_search[${incluTagName}]`, tag);
    }
    
    // set tag id
    searchParams = AO3UrlParser.addMissingId(searchParams, baseUrl);
    
    const initialQuery = AO3UrlParser.getValue(searchParams, 'work_search[query]');
    searchParams = AO3UrlParser.setValue(
      searchParams,
      'work_search[query]' , 
      getQueryString(filters, initialQuery));
    return searchParams;
  }

  async function applyFilters() {
    window.AO3Popup.createNotifPopup("Applying filters now...");
    const params = await formParams();
    const newUrl = `https://archiveofourown.org/works?${AO3UrlParser.buildQuery(params)}`
    window.location.href = newUrl;
    return;
  }

  applyFilters();
})();
