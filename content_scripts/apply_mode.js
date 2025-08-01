(() => {
  console.log('AO3 Apply Script injected successfully!');
  const AO3Parser = window.AO3Parser;

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

  function replaceQueryWithPref(pref, queries, val, append=false) {
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

  async function getQueryString(initialQuery) {
    let queries = parseQuery(initialQuery);
    const [langPref, exLangPref, exCreatorPref, chapPref, expChapPref] = [
      'language_id', '-language_id', '-creators', 'major_version', 'expected_number_of_chapters'
    ];

    const [queryStr, languagesRaw, excluLanguagesRaw, excludedCreatorsRaw, chapterNumRaw, expectedChaptersRaw] = 
      await Promise.all([
        getStorageValue('query'),
        getStorageList(langPref),
        getStorageList(exLangPref),
        getStorageList(exCreatorPref),
        getStorageValue(chapPref),
        getStorageValue(expChapPref),
      ]);

    // process queryStr
    const tokens = parseQuery(queryStr);
    for (let token of tokens) {
      if (token && !queries.includes(token)) {
        queries.push(token);
      }
    }

    // languagesList
    const languagesList = languagesRaw
      .map(x => `${langPref}:${getLangAbb(x)}`)
      .filter(x => x !== '' && !queries.includes(x));
    const languages = languagesList.join(' OR ');
    queries = replaceQueryWithPref(langPref, queries, languages, append=true);

    // excluLanguagesList
    const excluLanguagesList = excluLanguagesRaw
      .map(x => `${exLangPref}:${getLangAbb(x)}`)
      .filter(x => x !== '' && !queries.includes(x));
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
      queries = replaceQueryWithPref(chapPref, queries, chapterNums);
    }
    
    // total number of chapters
    if (expectedChaptersRaw) {
      const expectedChapters = `${expChapPref}:${expectedChaptersRaw}`;
      queries = replaceQueryWithPref(expChapPref, queries, expectedChapters);
    }

    console.log('Final query string:', queries.join(' '));
    return queries.join(' ');
  }

  async function justSetVals(searchParams) {
    const justSet = ['sort_column', 'crossover', 'complete', 'date_from', 'date_to', 'words_from', 'words_to'];
    for (const opt of justSet) {
      const value = await getStorageValue(opt);
      searchParams = AO3Parser.setValue(searchParams, `work_search[${opt}]`, value);
    }
    return searchParams;
  }

  async function formParams() {
    const baseUrl = window.location.href;
    let searchParams = AO3Parser.getParams(new URL(baseUrl));
    searchParams = await justSetVals(searchParams);

    // append tags
    const excluTagName = 'excluded_tag_names';
    const excludedTags = await getStorageList(excluTagName);
    for (const tag of excludedTags) {
      searchParams = AO3Parser.addValue(searchParams, `work_search[${excluTagName}]`, tag);
    }

    const incluTagName = 'other_tag_names';
    const includedTags = await getStorageList(incluTagName);
    for (const tag of includedTags) {
      searchParams = AO3Parser.addValue(searchParams, `work_search[${incluTagName}]`, tag);
    }
    
    // set tag id
    searchParams = AO3Parser.addTagId(searchParams, baseUrl);
    
    const initialQuery = AO3Parser.getValue(searchParams, 'work_search[query]');
    searchParams = AO3Parser.setValue(
      searchParams,
      'work_search[query]' , 
      await getQueryString(initialQuery));
    return searchParams;
  }

  async function applyFilters() {
    const params = await formParams();
    const newUrl = `https://archiveofourown.org/works?${AO3Parser.buildQuery(params)}`
    console.log(`Going to url: ${newUrl}`);
    window.location.href = newUrl;
    return;
  }

  applyFilters();
})();
