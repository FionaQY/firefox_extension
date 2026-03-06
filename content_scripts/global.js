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
      return values[filterType] || '';
    },

    isValid(relevantData, extractedData) {
      return extractedData > relevantData;
    },
    
    getLangAbb(lang) {
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
    },

    optionsPopupHelper(fields, isMobile, currSettings) {
      const contentContainer = document.createElement('div');
      contentContainer.style.cssText = isMobile ? `
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          min-height: 0;
          padding-top: 1em;
        ` : `
          padding-top: 1em;
          padding-left: 0.75em;
          padding-right: 0.75em;
        `;

      const headery = document.createElement('div');
      headery.innerHTML = `<div style="margin-bottom: 0.5em; font-weight: bold; margin-right: 2em;">If multiple values, please put a comma after each value.</div>`;
      contentContainer.appendChild(headery);

      const inputsMap = {};
      
      for (const [key, config] of Object.entries(fields)) {
        const container = document.createElement('div');
        container.style.cssText = config.type == 'checkbox'
        ?
        `
          display: flex;
          align-items: center;
          gap: 0.5em;
          padding-bottom: 0.5em;
        `
        : `
          display: flex;
          flex-direction: column;
          padding-bottom: 0.5em;
          gap: 0.4em;
        `;
        
        const label = document.createElement('label');
        label.textContent = `${config.label}:`;
        label.style.cssText = `
          ${isMobile ? '' : 'min-width: 160px;'}
          color: #ccc;
          font-size: '0.9rem;
          display: block;
        `;
        
        let input;
        

        switch (config.type) {
          case 'select': 
            input = document.createElement('select');
            for (const [val, opt] of Object.entries(config.options)) {
              const option = document.createElement('option');
              option.value = val;
              option.textContent = opt;
              input.appendChild(option);
            }
            input.selectedIndex = 0;
            break;
          case 'numberSpecial':
            input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'e.g. >1, 1, ([5 TO 20] !(7 || 13))';
            break;
          case 'textarea':
            input = document.createElement('textarea');
            input.style.minHeight = '30px';
            input.style.resize = 'none';
            input.style.overflow = 'hidden';
            input.style.boxSizing = 'border-box'; 
            input.addEventListener('input', () => {
              input.style.height = 'auto';
              input.style.height = input.scrollHeight + 'px';
            });
            break;
          default:
            input = document.createElement('input');
            input.type = config.type;
        }

        input.style.cssText = config.type !== 'checkbox' 
            ? `
            width: 100%;
            padding: 8px;
            font-size: ${isMobile ? '16px' : '0.95rem'};
            border: 1px solid #555;
            border-radius: 4px;
            background-color: #2a2a3d;
            color: white;
            box-sizing: border-box;
            ` : `
            width: 18px;
            height: 18px;
            accent-color: #ee5555;
            cursor: pointer;
            `;
            
        if (config.type === 'checkbox') {
          input.checked = currSettings[key] || false;

          container.appendChild(input); // checkbox first
          container.appendChild(label); // then label
        } else {
          input.value = currSettings[key] || input.value || '';

          container.appendChild(label);
          container.appendChild(input);
        }

        inputsMap[key] = { input, type: config.type };
        contentContainer.appendChild(container);
      } 
      return [inputsMap, contentContainer]
    },

    getButtons() {
      
    }
      
  }

})();
