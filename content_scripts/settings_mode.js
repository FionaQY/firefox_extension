/* eslint-disable no-unused-vars */
/* globals AO3Popup */
/* eslint-enable no-unused-vars */

(() => {
  const popupId = 'ao3-qof-popup';
  document.getElementById(popupId)?.remove();

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
    'search': '🔍︎ Search Bar',
  };

  function createColumn(title) {
    const isShow = title === 'Show';
    const col = document.createElement('div');
    col.classList.add('ao3-drop-column', isShow ? 'show' : 'hide');

    const header = document.createElement('div');
    header.textContent = isShow ? '✅ Show (click to hide)' : '🚫 Hide (click to show)';
    header.classList.add('ao3-drop-column-header');

    col.appendChild(header);
    return col;
  }

  function createItem(text, value, showCol, hideCol) {
    const item = document.createElement('div');
    item.textContent = text;
    item.id = value;
    item.draggable = true;
    item.classList.add('ao3-drop-item');

    item.addEventListener('click', () => {
      const parent = item.parentElement;
      const targetCol = parent === showCol ? hideCol : showCol;
      targetCol.appendChild(item);
    });

    return item;
  }

  function populateCols(settings, showCol, hideCol) {
    const popupOptions = settings.popupOptions || Object.keys(modeTextMap);
    showCol.innerHTML = '';
    hideCol.innerHTML = '';

    for (const [val, opt] of Object.entries(modeTextMap)) {
      const item = createItem(opt, val, showCol, hideCol);
      if (popupOptions.includes(val)) {
        showCol.appendChild(item);
      } else {
        hideCol.appendChild(item);
      }
    }
  }

  async function openSettingsPopup() {
    const settings = await window.AO3Popup.getSettings();
    let generalSettings = settings.general || {};
    const isMobile = window.innerWidth <= 768;

    const [inputsMap, contentContainer] = window.AO3Popup.optionsPopupHelper(
      fields, isMobile, generalSettings, false /* no hint */
    );

    // Drag-drop columns
    const dragDropContainer = document.createElement('div');
    dragDropContainer.classList.add('ao3-drop-container');
    const showCol = createColumn('Show');
    const hideCol = createColumn('Hide');
    populateCols(settings, showCol, hideCol);
    dragDropContainer.appendChild(showCol);
    dragDropContainer.appendChild(hideCol);
    contentContainer.appendChild(dragDropContainer);

    // Button definitions
    const buttons = [
      {
        text: '📋 Copy Settings',
        variant: 'neutral',
        onClick: async (e) => {
          const btn = e.target;
          const currentSettings = await window.AO3Popup.getSettings();
          const json = JSON.stringify(currentSettings, null, 5);
          await navigator.clipboard.writeText(json);
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 3000);
          }
        }
      },
      {
        text: '📋 Paste/Override',
        variant: 'success',
        onClick: async () => {
          const text = await navigator.clipboard.readText();
          if (!text || text.length === 0) return;
          if (confirm('This will override all settings and filters.')) {
            try {
              const imported = JSON.parse(text);
              if (typeof imported !== 'object' || imported === null) {
                throw new Error('Invalid settings format');
              }
              await window.AO3Popup.saveSettings(imported);
              document.getElementById(popupId)?.remove();
            } catch {
              window.AO3Popup.createNotifPopup('Invalid settings format');
            }
          }
        }
      },
      {
        text: 'Save',
        variant: 'primary',
        onClick: async () => {
          for (const [key, { input, type }] of Object.entries(inputsMap)) {
            generalSettings[key] = (type === 'checkbox') ? input.checked : input.value;
          }

          const popupOptions = Array.from(showCol.childNodes)
            .filter(x => x.id.length !== 0)
            .map(x => x.id);
          settings.popupOptions = popupOptions;
          settings.general = generalSettings;
          await window.AO3Popup.saveSettings(settings);
          document.getElementById(popupId)?.remove();
        }
      },
      {
        text: 'Reset',
        variant: 'danger',
        onClick: async () => {
          if (!confirm('Are you sure you want to reset Settings?')) return;
          delete settings.general;
          delete settings.popupOptions;
          await window.AO3Popup.saveSettings(settings);

          window.AO3Popup.resetInputs(contentContainer, inputsMap);
          populateCols({}, showCol, hideCol);
        }
      }
    ];

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: contentContainer,
      buttons: buttons,
      extraClasses: isMobile ? [] : ['flush-bottom']
    });

    document.body.appendChild(popup);
  }

  openSettingsPopup();
})();