/* globals browser */

(() => {
  // Listen for messages from background to show popup
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === 'showPopup') {
      await showPopup();
    }
  });

  const popupId = 'ao3-qof-popup';
  document.getElementById(popupId)?.remove();

  const modeTextMap = {
    block: { icon: '🚫', label: 'Block Tag/Author' },
    forgot: { icon: '🤔', label: 'I forgor' },
    apply: { icon: '✅', label: 'Apply Default Filters' },
    save: { icon: '💾', label: 'Set Default Filters' },
    hide: { icon: '🫣', label: 'Hide Works' },
    search: { icon: '🔍︎', label: 'Search Bar' },
    settings: { icon: '⚙️', label: 'Settings' }
  };

  async function showPopup() {
    const settings = await window.AO3Popup.getSettings();
    const isMobile = window.innerWidth <= 768;

    function createButton(val) {
      const { icon = '', label = '' } = modeTextMap[val] || {};

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = val;
      button.style.cssText = `
        box-sizing: border-box;
        cursor: pointer;
        width: 100%;
        min-height: ${isMobile ? '55px' : '70px'};
        border: 1px solid #444;
        border-radius: 12px;
        background-color: #252535;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.1rem;
        padding: 0.45rem 0.3rem;
        text-align: center;
        transition: transform 0.12s ease, border-color 0.12s ease, background-color 0.12s ease;
        overflow: hidden;
      `;

      const iconEl = document.createElement('div');
      iconEl.textContent = icon;
      iconEl.style.cssText = `
        font-size: ${isMobile ? '1.2rem' : '1.4rem'};
        line-height: 1;
      `;

      const textEl = document.createElement('div');
      textEl.textContent = label;
      textEl.style.cssText = `
        width: 100%;
        font-size: ${isMobile ? '0.85rem' : '0.8rem'};
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;

      button.appendChild(iconEl);
      button.appendChild(textEl);

      button.addEventListener('click', () => {
        browser.runtime.sendMessage({
          action: 'executeMode',
          mode: val,
        }).then(() => {
          document.getElementById(popupId)?.remove();
        });
      });

      button.addEventListener('pointerenter', () => {
        button.style.backgroundColor = '#2f2f45';
        button.style.borderColor = '#7a7aff';
        button.style.transform = 'translateY(-1px)';
      });
      button.addEventListener('pointerleave', () => {
        button.style.backgroundColor = '#252535';
        button.style.borderColor = '#555';
        button.style.transform = 'none';
      });

      return button;
    }

    let popupOptions = settings.popupOptions || [];
    const allModes = Object.keys(modeTextMap);
    if (!('popupOptions' in settings)) {
      popupOptions = allModes;
    } else {
      popupOptions = [...popupOptions, 'settings'];
    }

    const content = document.createElement('div');
    content.style.cssText = isMobile
      ? 'flex: 1; padding: 0.75em 0.65em 0.9em; box-sizing: border-box;'
      : 'padding: 0.75em 0.65em 0.9em; box-sizing: border-box;';

    const label = document.createElement('label');
    label.textContent = 'Select mode:';
    label.style.cssText = `
      color: #ccc;
      display: block;
      margin-bottom: 0.75em;
      font-size: ${isMobile ? '1rem' : '0.95rem'};
    `;
    content.appendChild(label);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${isMobile ? 1 : 2}, minmax(0, 1fr));
      grid-auto-rows: minmax(0, auto);
      justify-items: stretch;
      gap: 0.4rem;
      width: 100%;
      max-width: 100%;
    `;

    popupOptions.forEach(val => {
      if (val === '') return;
      grid.appendChild(createButton(val));
    });

    content.appendChild(grid);

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      extraStyles: isMobile
        ? 'max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column;'
        : 'max-height: 45vh; overflow-y: auto;',
    });

    document.body.appendChild(popup);
  }
})();