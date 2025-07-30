(() => {
  if (window.AO3Extractor && window.AO3Parser) {
    console.log('Global script already loaded, skipping');
    return;
  }
  console.log('Global script loaded');

  window.AO3Extractor = window.AO3Extractor || {
    extractString(workText, filterType) {
      const filterRegexMap = {
        'word_count': /Words:\s*([\d,]+)/,
        'comments_count': /Comments:\s*([\d,]+)/,
        'kudos_count': /Kudos:\s*([\d,]+)/,
        'bookmarks_count': /Bookmarks:\s*([\d,]+)/,
        'hits': /Hits:\s*([\d,]+)/,
        'revised_at': /\b(\d{1,2} \w+ \d{4})\b/,
        'authors_to_sort_on': /by\s+([^\n]+)/,
        'title_to_sort_on': /^(.+?)\s+by\s+/
      };
      const regex = filterRegexMap[filterType];
      if (!regex) {
        console.warn(`No regex found for filterType: ${filterType}`);
        return '';
      }
      const match = workText.match(regex);
      if (!match) {
        console.warn(`No match found for ${filterType} in text given`);
        return '';
      }
      return match[1].trim();
    },

    extractDate(workText, filterType) {
      const raw = this.extractString(workText, filterType);
      const parseDate = new Date(raw);
      return isNaN(parseDate) ? raw : parseDate;
    },

    extractNumber(workText, filterType) {
      const raw = this.extractString(workText, filterType);
      if (raw.length === 0) return 0;
      const numVal = raw.replace(/,/g, '');
      return parseInt(numVal, 10);
    },

    extractRelevantData(workText, filterType) {
      if (filterType === 'revised_at') {
        return this.extractDate(workText, filterType);
      } else if (filterType === 'authors_to_sort_on' || filterType === 'title_to_sort_on') {
        return this.extractString(workText, filterType);
      } else {
        return this.extractNumber(workText, filterType);
      }
    },

    isValid(relevantData, extractedData) {
      return extractedData > relevantData;
    }
  };

  window.AO3Parser = window.AO3Parser || {
    getParams(baseUrl) {
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
      const params = baseUrl.searchParams; 
      const searchParams = {};

      for (const [key, defaultVal] of Object.entries(defaultValues))  {
        searchParams[key] = params.get(key) ?? defaultVal;
      }
      return searchParams
    },

    setValue(searchParams, key, val) {
      searchParams[key] = val;
      return searchParams
    },

    getValue(searchParams, key) {
      return searchParams[key] || '';
    },

    addValue(searchParams, key, val) {
      const rawStr = this.getValue(searchParams, key);
      const blockedTags = rawStr
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      if (!blockedTags.includes(val)) {
        blockedTags.push(val);
      }
      return this.setValue(searchParams, key, blockedTags.join(","));
    },

    superEncodeURI(str) { // important
      return new URLSearchParams({ text: str }).toString().replace(/^text=/, '');
    },

    buildQuery(paramsObj) {
      return Object.entries(paramsObj)
        .filter(([key, _]) => key != 'page')
        .map(([key, value]) => `${key}=${value == null 
          ? '' : value.includes('&') 
          ? this.superEncodeURI(value) 
          : value}`)
        .join('&');
    },

    extractTagNameFromUrl(url) {
      try {       
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/');
        const tagIndex = parts.findIndex(part => part === 'tags') + 1;
        return parts[tagIndex];
      } catch (e) {
        console.error("Error parsing URL:", e);
        return null;
      }
    },

    addTagId(searchParams, baseUrl) {
      if (searchParams['tag_id'] != '') {
        return searchParams;
      }
      const tagName = this.extractTagNameFromUrl(decodeURI(baseUrl));
      return this.setValue(searchParams, 'tag_id', tagName);
    }
  }
})();
