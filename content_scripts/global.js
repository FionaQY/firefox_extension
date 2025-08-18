(() => {
  const WORK_DEFAULTS = {
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
    'user_id': '',
    'exclude_work_search[archive_warning_ids][]': '',
    'exclude_work_search[freeform_ids][]': '',
    'exclude_work_search[rating_ids][]': '',
    'exclude_work_search[category_ids][]': '',
    'exclude_work_search[fandom_ids][]': '',
    'exclude_work_search[character_ids][]': '',
    'exclude_work_search[relationship_ids][]': '',
    'include_work_search[archive_warning_ids][]': '',
    'include_work_search[freeform_ids][]': '',
    'include_work_search[rating_ids][]': '',
    'include_work_search[category_ids][]': '',
    'include_work_search[fandom_ids][]': '',
    'include_work_search[character_ids][]': '',
    'include_work_search[relationship_ids][]': '',
  };

  const BOOKMARK_DEFAULTS = {
    'bookmark_search[sort_column]': 'created_at',
    'bookmark_search[other_tag_names]': '',
    'bookmark_search[other_bookmark_tag_names]': '',
    'bookmark_search[excluded_tag_names]': '',
    'bookmark_search[excluded_bookmark_tag_names]': '',
    'bookmark_search[bookmarkable_query]': '',
    'bookmark_search[bookmark_query]': '',
    'bookmark_search[language_id]': '',
    'bookmark_search[rec]': '',
    'bookmark_search[with_notes]': '',
    'commit': 'Sort and Filter',
    'page': '1',
    'pseud_id': '',
    'user_id': '',
    'exclude_bookmark_search[rating_ids][]': '',
    'exclude_bookmark_search[archive_warning_ids][]': '',
    'exclude_bookmark_search[category_ids][]': '',
    'exclude_bookmark_search[fandom_ids][]': '',
    'exclude_bookmark_search[character_ids][]': '',
    'include_bookmark_search[rating_ids][]': '',
    'include_bookmark_search[archive_warning_ids][]': '',
    'include_bookmark_search[category_ids][]': '',
    'include_bookmark_search[fandom_ids][]': '',
    'include_bookmark_search[character_ids][]': '',
  };

  function mergeParams(defaults, params) {
    const out = {};
    for (const [key, def] of Object.entries(defaults)) {
      const val = params.get(key)?.trim();
      out[key] = (!val || val.length === 0) ? def : val;
    }
    return out;
  }

  window.AO3Extractor = window.AO3Extractor || {
    extractAllValues(work) {
      const getText = (selector) => work.querySelector(selector)?.textContent.trim() || '';
      const getAttr = (selector, attr) => work.querySelector(selector)?.getAttribute(attr) || '';

      const formatNumber = (raw) => {
        if (!raw || raw.length === 0) return 0;
        return parseInt(raw.replace(/,/g, ''), 10) || 0;
      };

      const formatDate = (raw) => {
        const parseDate = new Date(raw);
        return isNaN(parseDate) ? raw : parseDate;
      };

      return {
        language: getAttr('dd.language', 'lang'),
        word_count: formatNumber(getText('dd.words')),
        chapters: getText('dd.chapters'),
        comments_count: formatNumber(getText('dd.comments')),
        kudos_count: formatNumber(getText('dd.kudos')),
        bookmarks_count: formatNumber(getText('dd.bookmarks')),
        hits: formatNumber(getText('dd.hits')),        
        revised_at: formatDate(getText('p.datetime')),
        authors_to_sort_on: getText('a[rel="author"]'),
      }
    },

    extractRelevantData(work, filterType) {
      const values = this.extractAllValues(work);
      return values[filterType]?.trim() || '';
    },

    isValid(relevantData, extractedData) {
      return extractedData > relevantData;
    }
  };

  window.AO3UrlParser = window.AO3UrlParser || {
    getParams(baseUrl, isBookmarks = false) {
      return mergeParams(isBookmarks ? BOOKMARK_DEFAULTS : WORK_DEFAULTS, baseUrl.searchParams);
    },

    getBookmarkParams(baseUrl) {
      return this.getParams(baseUrl, true);
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
        .filter(([key, val]) => key != 'page' && val.length != 0)
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
