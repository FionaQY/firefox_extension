(() => {
  const popupId = 'ao3-generalSettings-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  const fields = {
    populateBookmark: {
      label: 'Automatically Populate Bookmark',
      type: 'checkbox',
    },
    shrinkWorks: {
      label: 'Shrink Works',
      type: 'checkbox',
    },
    summaryNoWifi: {
      label: 'Get Summary Without Wifi',
      type: 'checkbox',
    },
  };

  const modeTextMap = {
    'block': '🚫 Block tag/author',
    'forgot': '🤔 I forgor',
    'apply': '✅ Apply default filters',
    'save': '💾 Set default filters',
    'hide': '🫣 Hide Works',
  };

  function createColumn(title) {
    const col = document.createElement('div');
    col.classList.add('drop-column');
    col.style.cssText = `
      flex: 1;
      background: #2a2a3d;
      padding: 0.5em;
      border-radius: 6px;
      min-height: 150px;
      display: flex;
      flex-direction: column;
      gap: 0.4em;
      border: 2px solid ${title === 'Show' ? '#4caf50' : '#f44336'};
    `;

    const header = document.createElement('div');
    header.textContent = title === 'Show' ? '✅ Show (click to hide)' : '🚫 Hide (click to show)';
    header.style.cssText = `
      font-weight: bold;
      margin-bottom: 0.5em;
      font-size: 1rem;
      text-align: center;
      color: ${title === 'Show' ? '#4caf50' : '#f44336'};
      border-bottom: 1px solid #444;
      padding-bottom: 0.25em;
    `;

    col.appendChild(header);
    return col;
  }


  function createItem(text, value, showCol, hideCol) {
    const item = document.createElement('div');
    item.textContent = text;
    item.id = value;
    item.draggable = true;
    item.style.cssText = `
      background: #3a3a4d;
      padding: 0.4em 0.6em;
      border-radius: 4px;
      cursor: grab;
    `;

    item.addEventListener('click', () => {
      const parent = item.parentElement;
      const targetCol = parent === showCol ? hideCol : showCol;
      targetCol.appendChild(item);
    });

    return item;
  }

  function populateCols(settings, showCol, hideCol) {
    const popupOptions = settings["popupOptions"] || Object.keys(modeTextMap);
    showCol.innerHTML = '';
    hideCol.innerHTML = '';
    
    for (const [val, opt] of Object.entries(modeTextMap)) {
      if (popupOptions.includes(val)) {
        showCol.appendChild(createItem(opt, val, showCol, hideCol));
      } else {
        hideCol.appendChild(createItem(opt, val, showCol, hideCol));
      }
    }
  }

  async function openSettingsPopup() {
    const { settings = {} } = await browser.storage.local.get('settings');
    let generalSettings = settings['general'] || {};

    const popup = document.createElement('div');
    popup.id = popupId;
    const isMobile = window.innerWidth <= 768;
    popup.style.cssText = `
      position: fixed;
      ${isMobile ? 
        'top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 70%; border-radius: 0; padding: 1em 1em 0; margin: 0 auto;' : 
        'top: 20px; right: 20px; width: 380px; border-radius: 8px;' 
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
    `;

    const buttonClose = document.createElement('button');
    buttonClose.textContent = '×';
    buttonClose.style.cssText = `
      position: absolute;
      top: ${isMobile ? '12px' : '8px'};
      right: ${isMobile ? '12px' : '8px'};
      width: ${isMobile ? '32px' : '24px'};
      height: ${isMobile ? '32px' : '24px'};
      background: none;
      border:none;
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

    buttonClose.addEventListener('mouseenter', () => {
      buttonClose.style.background = 'rgba(255, 255, 255, 0.2)';
      buttonClose.style.color = '#fff';
    });

    buttonClose.addEventListener('mouseleave', () => {
      buttonClose.style.background = 'rgba(255, 255, 255, 0.1)';
      buttonClose.style.color = '#ccc';
    });
    
    buttonClose.onclick = () => popup.remove();
    popup.appendChild(buttonClose);

    const [inputsMap, contentContainer] = window.AO3Popup.optionsPopupHelper(fields, isMobile, generalSettings);

    const dragDropContainer = document.createElement('div');
    dragDropContainer.style.cssText = `
      display: flex;
      gap: 1em;
      margin-top: 1em;
    `;

    const showCol = createColumn('Show');
    const hideCol = createColumn('Hide');

    populateCols(settings, showCol, hideCol);

    dragDropContainer.appendChild(showCol);
    dragDropContainer.appendChild(hideCol);
    contentContainer.appendChild(dragDropContainer);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      gap: 1em;
      padding: 1em;
      flex-wrap: wrap;
    `;

    const buttonCopy = window.AO3Popup.getButton("#6c757d", isMobile, '📋 Copy Settings');
    buttonCopy.addEventListener('click', async () => {
      const { settings } = await browser.storage.local.get('settings');
      const json = JSON.stringify(settings, null, 5);
      await navigator.clipboard.writeText(json);
      buttonCopy.textContent = '✓ Copied!';
      setTimeout(() => { buttonCopy.textContent = '📋 Copy'; }, 1500);
    })

    const buttonPaste = window.AO3Popup.getButton("#28a745", isMobile, '📋 Paste/Override');
    buttonPaste.addEventListener('click', async () => {
      const text = await navigator.clipboard.readText();
      if (!text || text.length == 0) {
        return;
      }
      if (confirm('This will override all settings and filters.')) {
        const imported = JSON.parse(text);
        if (typeof imported !== 'object' || imported === null) {
          throw new Error('Invalid settings format');
        }
        await browser.storage.local.set({ settings: imported }).then(() => popup.remove());
      }
    });

    buttonContainer.appendChild(buttonCopy);
    buttonContainer.appendChild(buttonPaste);

    const buttonSave = window.AO3Popup.getButton("#4a90e2", isMobile, 'Save');
    buttonSave.addEventListener('click', async () => {
      for (const [key, {input, type}] of Object.entries(inputsMap)) {
        generalSettings[key] = (type == 'checkbox') ? input.checked : input.value;
      }
      const popupOptions = Array.from(showCol.childNodes).filter(x => x.id.length != 0).map(x => x.id);
      settings.popupOptions = popupOptions;
      settings["general"] = generalSettings;
      await browser.storage.local.set({ settings }).then(() => popup.remove());
    });
    
    const buttonReset = window.AO3Popup.getButton("#ee5555", isMobile, 'Reset');
    buttonReset.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset Settings?')) {
        delete settings['general'];
        delete settings['popupOptions'];
        await browser.storage.local.set({ settings }).then(() => popup.remove());

        const inputs = contentContainer.querySelectorAll('input');
        Array.from(inputs).forEach(x => x.type === 'checkbox' ? x.checked = false : x.value = '');
        const selects = contentContainer.querySelectorAll('select');
        Array.from(selects).forEach(x => x.selectedIndex = 0);
        populateCols({}, showCol, hideCol);
      }
    });
    
    buttonContainer.appendChild(buttonSave);
    buttonContainer.appendChild(buttonReset);
    popup.appendChild(contentContainer);
    popup.appendChild(buttonContainer);
    
    document.body.appendChild(popup);
  }

  openSettingsPopup();
})();
