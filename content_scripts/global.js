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
      if (!settings['general']['summaryNoWifi']) {
        resolve(window.AO3Extractor.getTags(document, url, needHref));
      }

      return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
        iframe.src = url;

        iframe.onload = () => {
          try {
            const doc = iframe.contentDocument;

            resolve(window.AO3Extractor.getTags(doc, url));

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
    /**
     * Displays a small notification popup that disappears after 3 seconds or on click.
     * @param {string} msg - The message to display.
     */
    createNotifPopup(msg) {
      const popupId = 'ao3-notif-popup';
      document.getElementById(popupId)?.remove();

      const popup = document.createElement('div');
      popup.id = popupId;
      popup.textContent = msg;

      popup.style.cssText = `
        position: fixed;
        background: #1e1e2f;
        color: #eee;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 0.5em 1em 0.5em 1em; /* top/bottom 0.5, left/right 1 */
        padding-right: 2em;
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
      container.style.cssText = this._getContentContainerStyle(isMobile);

      if (showHint) {
        const hint = document.createElement('div');
        hint.textContent = 'If multiple values, please put a comma after each value.';
        hint.style.cssText = 'margin-bottom: 0.5em; font-weight: bold; margin-right: 2em;';
        container.appendChild(hint);
      }

      const inputsMap = {};
      for (const [key, config] of Object.entries(fields)) {
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = this._getFieldContainerStyle(config.type);

        const label = document.createElement('label');
        label.textContent = `${config.label}:`;
        label.style.cssText = this._getLabelStyle(isMobile, config.type);

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
     * @param {string} color - Background color.
     * @param {boolean} isMobile - Mobile sizing.
     * @param {string} text - Button label.
     * @returns {HTMLButtonElement}
     */
    getButton(color, isMobile, text) {
      const butt = document.createElement('button');
      butt.textContent = text;
      butt.style.cssText = `
        flex: 1 1 auto;
        padding: 8px 12px;
        background: ${color};
        color: white;
        border: none;
        border-radius: 4px;
        font-size: ${isMobile ? '16px' : '0.95rem'};
        cursor: pointer;
        touch-action: manipulation;
      `;
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
      btn.style.cssText = `
        position: absolute;
        top: ${isMobile ? '12px' : '8px'};
        right: ${isMobile ? '12px' : '8px'};
        width: ${isMobile ? '32px' : '24px'};
        height: ${isMobile ? '32px' : '24px'};
        background: none;
        border: none;
        font-size: ${isMobile ? '24px' : '18px'};
        font-weight: bold;
        color: #ccc;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 10000;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.color = '#ccc';
      });
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
     * @param {string} [options.extraStyles] - Additional CSS to merge.
     * @param {Function} [options.onClose] - Callback when closed.
     * @param {HTMLElement} [options.content] - Element to append inside the popup (before buttons).
     * @param {Array} [options.buttons] - Array of button objects for createButtonBar: { text, color, onClick }.
     * @returns {HTMLDivElement} The created popup element.
     */
    createPopupContainer(id, isMobile, options = {}) {
      const popup = document.createElement('div');
      popup.id = id;
      popup.style.cssText = `
        position: fixed;
        ${isMobile 
          ? 'top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 70%; border-radius: 0; padding: 1em 1em 0; margin: 0 auto;' 
          : 'top: 20px; right: 20px; width: 380px; border-radius: 8px; padding: 0.5em;'
        }
        background: #1e1e2f;
        color: #eee;
        border: 1px solid #444;
        max-height: ${isMobile ? '100vh' : '50vh'};
        overflow: ${isMobile ? 'hidden' : 'auto'};
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        font-family: sans-serif;
        scrollbar-width: thin;
        scrollbar-color: #555 #2e2e3e;
        -webkit-overflow-scrolling: touch;
        box-sizing: border-box;
        ${isMobile ? 'display: flex; flex-direction: column;' : ''}
        ${options.extraStyles || ''}
      `;

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
     * @param {Array} buttons - Array of { text, color, onClick }.
     * @param {boolean} isMobile - Whether the device is mobile.
     * @returns {HTMLDivElement} The button bar container.
     */
    createButtonBar(buttons, isMobile) {
      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 1em;
        padding: 1em;
        flex-wrap: wrap;
      `;
      buttons.forEach(btnDef => {
        const btn = this.getButton(btnDef.color, isMobile, btnDef.text);
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
     * @param {Array} options.buttons - Array of { text, color, onClick, active? }.
     * @param {Function} [options.onInputChange] - Callback when input value changes (receives new value).
     * @param {boolean} [options.isMobile] - Override mobile detection.
     * @returns {HTMLDivElement} The search bar container.
     */
    createSearchBar(options = {}) {
      const {
        inputPlaceholder = '',
        inputValue = '',
        buttons = [],
        onInputChange = null,
        isMobile = window.innerWidth <= 768
      } = options;

      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.5em;
        background: #2a2a3d;
        border-radius: 4px;
        border: 1px solid #444;
      `;

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = inputPlaceholder;
      input.value = inputValue;
      input.style.cssText = `
        flex: 1;
        padding: 8px 10px;
        font-size: ${isMobile ? '16px' : '0.95rem'};
        border: 1px solid #555;
        border-radius: 4px;
        background: #1e1e2f;
        color: white;
        outline: none;
        min-width: 0;
      `;
      if (onInputChange) {
        input.addEventListener('input', (e) => onInputChange(e.target.value));
      }
      container.appendChild(input);

      // Buttons
      buttons.forEach(btnDef => {
        const btn = document.createElement('button');
        btn.textContent = btnDef.text;
        const bgColor = btnDef.color || 'transparent';
        btn.style.cssText = `
          padding: 8px 12px;
          background: ${bgColor};
          color: white;
          border: none;
          border-radius: 4px;
          font-size: ${isMobile ? '16px' : '0.95rem'};
          cursor: pointer;
          white-space: nowrap;
          touch-action: manipulation;
          transition: filter 0.2s, background 0.2s;
        `;
        btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.1)'; });
        btn.addEventListener('mouseleave', () => { btn.style.filter = 'none'; });
        btn.addEventListener('click', (e) => { if (btnDef.onClick) {btnDef.onClick(e);}
        });
        container.appendChild(btn);
      });

      return container;
    },

    // -------- private helpers for optionsPopupHelper --------
    _getContentContainerStyle(isMobile) {
      return isMobile
        ? 'flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; min-height: 0; padding-top: 1em;'
        : 'padding-top: 1em; padding-left: 0.75em; padding-right: 0.75em;';
    },

    _getFieldContainerStyle(type) {
      return type === 'checkbox'
        ? 'display: flex; align-items: center; gap: 0.5em; padding-bottom: 0.5em;'
        : 'display: flex; flex-direction: column; padding-bottom: 0.5em; gap: 0.4em;';
    },

    _getLabelStyle(isMobile, type) {
      return type === 'checkbox'
        ? 'color: #ccc; font-size: 0.9rem; display: block;'
        : `${isMobile ? '' : 'min-width: 160px;'} color: #ccc; font-size: 0.9rem; display: block;`;
    },

    _createInput(config, isMobile, currentValue) {
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
      return input;
    },

    _applyInputStyles(input, config, isMobile) {
      if (config.type !== 'checkbox') {
        input.style.cssText = `
          width: 100%;
          padding: 8px;
          font-size: ${isMobile ? '16px' : '0.95rem'};
          border: 1px solid #555;
          border-radius: 4px;
          background-color: #2a2a3d;
          color: white;
          box-sizing: border-box;
        `;
      } else {
        input.style.cssText = `
          width: 18px;
          height: 18px;
          accent-color: #ee5555;
          cursor: pointer;
        `;
      }
    }
  };
})();