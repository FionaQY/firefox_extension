(() => {
  if (window.AO3Extractor && window.AO3UrlParser) {
    return;
  }

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

  window.AO3UrlParser = window.AO3UrlParser || {
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
        'page': '1',
        'pseud_id': '',
        'user_id': ''
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
      const isBookmarks = paramsObj.user_id != '';
      return Object.entries(paramsObj)
        .filter(([key, _]) => key != 'page')
        .filter(([key, val]) => !(key == 'pseud_id' && val == ''))
        .filter(([key, _]) => isBookmarks ? key != 'tag_id' : key != 'user_id')
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

    addTagId(searchParams, tagName) {
      if (searchParams['tag_id'] != '') {
        return searchParams;
      }
      return this.setValue(searchParams, 'tag_id', tagName);
    },

    addUserId(searchParams, userId, pseudId) {
      if (searchParams['user_id'] != '') {
        return searchParams;
      }
      let temp = this.setValue(searchParams, 'user_id', userId);
      return this.setValue(temp, 'pseud_id', pseudId);
    },

    addMissingId(searchParams, baseUrl) {
      try {       
        const urlObj = new URL(decodeURI(baseUrl));
        const parts = urlObj.pathname.split('/');
        if (parts.includes("tags")) {
          const tagIndex = parts.findIndex(part => part === 'tags') + 1;
          return this.addTagId(searchParams, parts[tagIndex]);
        } else if (parts.includes("users")) {
          const userIndex = parts.findIndex(part => part === 'users') + 1;
          const pseudId = parts.includes("pseuds") ? parts.findIndex(part => part === 'pseuds') + 1 : userIndex;
          return this.addUserId(searchParams, parts[userIndex], parts[pseudId]);
        }
        return searchParams;
      } catch (e) {
        console.error("Error parsing URL:", e);
        return null;
      } 
    },

    getWorkUrl(url) {
      const match = url.match(/\/works\/(\d+)/);
      if (match) {
        const workId = match[1]; 
        return `https://archiveofourown.org/works/${workId}`        
      } else {
        return '';
      }
    }
  };

  window.AO3Popup = window.AO3Popup || {
    createNotifPopup(msg) {
      const popupId = 'ao3-notif-popup';
      const tempPopup = document.getElementById(popupId);
      if (tempPopup) tempPopup.remove();

      const popup = document.createElement('div');
      popup.id = popupId;
      popup.textContent = msg;

      popup.style.cssText = `
        position: fixed;
        background: #1e1e2f;
        color: #eee;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 0.5em 1em;
        max-width: 280px;
        font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        z-index: 9999;
        cursor: default;
        user-select: text;
        white-space: pre-wrap;
        word-break: break-word;
      `;

      document.body.appendChild(popup);
      const popupRect = popup.getBoundingClientRect();

      const maxLeft = window.innerWidth - popupRect.width - 20;
      const maxTop = window.innerHeight - popupRect.height - 20;
      const randomLeft = Math.floor(Math.random() * maxLeft) + 10;
      const randomTop = Math.floor(Math.random() * maxTop) + 10;

      popup.style.left = `${randomLeft}px`;
      popup.style.top = `${randomTop}px`;
      popup.style.position = 'fixed';
      popup.style.paddingRight = '2em';
      setTimeout(() => popup.remove(), 3000)
      document.body.addEventListener('click', (e) => {
        popup.remove();
      })       
    }
      
  }

})();
