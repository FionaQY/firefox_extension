/* globals browser */
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
    },

    getTags(doc, url, needHref) {
      const TAGCATEGORIES = ['rating', 'warning', 'category', 'fandom', 'relationship', 'character', 'freeform'];

      const summary = doc.querySelector('div.summary.module').innerText;
      let tags = {}; 
      for (const cat of TAGCATEGORIES) {
        const links = [...doc.querySelectorAll(`dd.${cat} a`)].map(x => !needHref ? x.innerText.trim() : `<a href="${x.href}">${x.innerText.trim()}</a>`);
        tags[cat] = links;
      }

      const title = `<a href="${url}">${doc.querySelector('h2.title.heading').innerText.trim()}</a>`;
      const author = doc.querySelector('h3.byline.heading').innerHTML.trim();
      const heading = `${title} by ${author}`
      return { heading, summary, tags };
    },

    async getSummaryFromWork(url, needHref) {
      const { settings = {} } = await browser.storage.local.get('settings');
      
      if (settings['general'] && settings['general']['summaryNoWifi']) {
        if (document.querySelector('h2.title.heading')) {
          return window.AO3Extractor.getTags(document, url, needHref);
        }
        return null;
      }

      return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.classList.add('ao3-offscreen-iframe');
        iframe.src = url;

        iframe.onload = () => {
          try {
            const doc = iframe.contentDocument;
            resolve(window.AO3Extractor.getTags(doc, url, needHref));
          } catch (err) {
            console.error('Error parsing work in iframe:', err);
            resolve(null);
          } finally {
            iframe.remove();
          }
        };

        document.body.appendChild(iframe);
      });
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
        .filter(([key]) => isBookmarks ? key != 'tag_id' : key != 'user_id')
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
    /**
     * Displays a small notification popup that disappears after 3 seconds or on click.
     * @param {string} msg - The message to display.
     */
    createNotifPopup(msg) {
      const popupId = 'ao3-qof-notif-popup';
      document.getElementById(popupId)?.remove();

      const popup = document.createElement('div');
      popup.id = popupId;
      popup.classList.add('ao3-notif-popup');
      popup.textContent = msg;

      document.body.appendChild(popup);
      const popupRect = popup.getBoundingClientRect();

      const maxLeft = window.innerWidth - popupRect.width - 20;
      const maxTop = window.innerHeight - popupRect.height - 20;
      const randomLeft = Math.floor(Math.random() * maxLeft) + 10;
      const randomTop = Math.floor(Math.random() * maxTop) + 10;

      popup.style.left = `${randomLeft}px`;
      popup.style.top = `${randomTop}px`;

      // Auto-remove after 3 seconds
      const timer = setTimeout(() => popup.remove(), 3000);

      const clickHandler = () => {
        clearTimeout(timer);
        popup.remove();
        document.body.removeEventListener('click', clickHandler, { once: true });
      };
      document.body.addEventListener('click', clickHandler, { once: true });
    },

    /**
     * Creates a structured popup content with input fields.
     * @param {Object} fields - Configuration object for fields (key -> {label, type, options?}).
     * @param {boolean} isMobile - Whether the viewport is mobile-sized.
     * @param {Object} currSettings - Current values to populate the inputs.
     * @param {boolean} [showHint=false] - Whether to display the "multiple values" hint.
     * @returns {[Object, HTMLDivElement]} A tuple: [inputsMap, contentContainer].
     */
    optionsPopupHelper(fields, isMobile, currSettings, showHint = false) {
      const container = document.createElement('div');
      container.classList.add('ao3-options-content', isMobile ? 'mobile' : 'desktop');

      if (showHint) {
        const hint = document.createElement('div');
        hint.textContent = 'If multiple values, please put a comma after each value.';
        hint.classList.add('ao3-options-hint');
        container.appendChild(hint);
      }

      const inputsMap = {};
      for (const [key, config] of Object.entries(fields)) {
        const fieldContainer = document.createElement('div');
        fieldContainer.classList.add('ao3-field-container');
        if (config.type === 'checkbox') {
          fieldContainer.classList.add('checkbox');
        }

        const label = document.createElement('label');
        label.textContent = `${config.label}:`;
        label.classList.add('ao3-field-label');
        if (config.type !== 'checkbox' && !isMobile) {
          label.classList.add('desktop');
        }

        const input = this._createInput(config, isMobile, currSettings[key]);
        this._applyInputStyles(input, config, isMobile);

        if (config.type === 'checkbox') {
          fieldContainer.appendChild(input);
          fieldContainer.appendChild(label);
          input.checked = currSettings[key] || false;
        } else {
          fieldContainer.appendChild(label);
          fieldContainer.appendChild(input);
          input.value = currSettings[key] || '';
        }

        inputsMap[key] = { input, type: config.type };
        container.appendChild(fieldContainer);
      }

      return [inputsMap, container];
    },

    /**
     * Creates a styled button.
     * @param {string} variant - Colour variant ('primary', 'danger', 'neutral' or 'success').
     * @param {boolean} isMobile - Mobile sizing.
     * @param {string} text - Button label.
     * @returns {HTMLButtonElement}
     */
    getButton(variant, isMobile, text) {
      const butt = document.createElement('button');
      butt.type = 'button';
      butt.textContent = text;
      butt.classList.add('ao3-bar-button', `ao3-${variant || 'neutral'}`);
      if (isMobile) {
        butt.classList.add('mobile');
      }
      return butt;
    },

    /**
     * Creates a consistent close button for popups.
     * @param {boolean} isMobile - Whether the device is mobile.
     * @param {Function} [onClose] - Optional callback to run when closed. If not provided, removes the closest popup.
     * @returns {HTMLButtonElement} The configured close button.
     */
    createCloseButton(isMobile, onClose) {
      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.classList.add('ao3-close-button', isMobile ? 'mobile' : 'desktop');
      btn.onclick = () => {
        if (onClose) onClose();
        else {
          const popup = btn.closest(`[id$="-popup"]`); // closes those whose ids end with "-popup"
          if (popup) popup.remove();
        }
      };
      return btn;
    },

    /**
     * Creates a base popup container.
     * @param {string} id - Unique ID for the popup.
     * @param {boolean} isMobile - Whether the device is mobile.
     * @param {Object} options - Configuration.
     * @param {string[]} [options.extraClasses] - Additional classes to add to the popup.
     * @param {Function} [options.onClose] - Callback when closed.
     * @param {HTMLElement} [options.content] - Element to append inside the popup (before buttons).
     * @param {Array} [options.buttons] - Array of button objects for createButtonBar: { text, variant, onClick }.
     * @returns {HTMLDivElement} The created popup element.
     */
    createPopupContainer(id, isMobile, options = {}) {
      const popup = document.createElement('div');
      popup.id = id;
      popup.classList.add('ao3-popup-container', isMobile ? 'mobile' : 'desktop');
      if (options.extraClasses) {
        popup.classList.add(...options.extraClasses);
      }

      const closeBtn = this.createCloseButton(isMobile, options.onClose);
      popup.appendChild(closeBtn);

      if (options.content) {
        popup.appendChild(options.content);
      }

      if (options.buttons && options.buttons.length) {
        const buttonBar = this.createButtonBar(options.buttons, isMobile);
        popup.appendChild(buttonBar);
      }
      return popup;
    },

    /**
     * Creates a horizontal button bar from an array of button definitions.
     * @param {Array} buttons - Array of { text, variant, onClick }.
     * @param {boolean} isMobile - Whether the device is mobile.
     * @returns {HTMLDivElement} The button bar container.
     */
    createButtonBar(buttons, isMobile) {
      const container = document.createElement('div');
      container.classList.add('ao3-button-bar');
      buttons.forEach(btnDef => {
        const btn = this.getButton(btnDef.variant, isMobile, btnDef.text);
        btn.addEventListener('click', btnDef.onClick);
        container.appendChild(btn);
      });
      return container;
    },

    /**
     * Retrieves the full settings object from storage.
     * @returns {Promise<Object>} The settings object (defaults to empty if none).
     */
    async getSettings() {
      const { settings = {} } = await browser.storage.local.get('settings');
      return settings;
    },

    /**
     * Saves the entire settings object to storage.
     * @param {Object} settings - The settings object to store.
     * @returns {Promise<void>}
     */
    async saveSettings(settings) {
      await browser.storage.local.set({ settings });
    },

    /**
     * Resets all input elements inside a container to default values.
     * @param {HTMLElement} container - The container holding the inputs.
     * @param {Object} inputsMap - The map returned by optionsPopupHelper (optional, if not provided will search DOM).
     */
    resetInputs(container, inputsMap) {
      if (inputsMap) {
        for (const { input, type } of Object.values(inputsMap)) {
          if (type === 'checkbox') input.checked = false;
          else input.value = '';
        }
      } else {
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
          else if (el.tagName === 'SELECT') el.selectedIndex = 0;
          else el.value = '';
        });
      }
    },

    /**
     * Creates a search bar component with an input field and buttons on the right.
     * @param {Object} options - Configuration.
     * @param {string} options.inputPlaceholder - Placeholder text for the input.
     * @param {string} options.inputValue - Initial value for the input.
     * @param {Array} options.buttons - Array of { text, variant, onClick, active? }.
     * @param {Function} [options.onInputChange] - Callback when input value changes (receives new value).
     * @param {boolean} [options.isMobile] - Override mobile detection.
     * @returns {HTMLDivElement} The search bar container.
     */
    /**
     * Parses a trusted HTML string into a document fragment.
     * This avoids direct innerHTML usage while preserving safe markup like links.
     * @param {string} html
     * @returns {DocumentFragment}
     */
    parseHtmlFragment(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const fragment = document.createDocumentFragment();
      for (const node of Array.from(doc.body.childNodes)) {
        fragment.appendChild(node);
      }
      return fragment;
    },

    createSearchBar(options = {}) {
      const {
        inputPlaceholder = '',
        inputValue = '',
        buttons = [],
        onInputChange = null,
        isMobile = window.innerWidth <= 768
      } = options;

      const container = document.createElement('div');
      container.classList.add('ao3-search-bar');

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = inputPlaceholder;
      input.value = inputValue;
      input.classList.add('ao3-search-input');
      if (isMobile) {
        input.classList.add('mobile');
      }
      if (onInputChange) {
        input.addEventListener('input', (e) => onInputChange(e.target.value));
      }
      container.appendChild(input);

      // Buttons
      buttons.forEach(btnDef => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = btnDef.text;
        btn.classList.add('ao3-search-button');
        if (isMobile) {
          btn.classList.add('mobile');
        }
        if (btnDef.variant) {
          btn.classList.add(`ao3-${btnDef.variant}`);
        }
        if (btnDef.active) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', (e) => { if (btnDef.onClick) {btnDef.onClick(e);}
        });
        container.appendChild(btn);
      });

      return container;
    },

    // -------- private helpers for optionsPopupHelper --------
    _createInput(config) {
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
          input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
          });
          break;
        default:
          input = document.createElement('input');
          input.type = config.type;
      }
      return input;
    },

    _applyInputStyles(input, config, isMobile) {
      if (config.type !== 'checkbox') {
        input.classList.add('ao3-field-input');
        if (isMobile) {
          input.classList.add('mobile');
        }
      } else {
        input.classList.add('ao3-field-checkbox');
      }
    }
  };
})();