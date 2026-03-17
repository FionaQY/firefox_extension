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
    '': '',
    'block': '🚫 Block Tag/Author',
    'forgot': '🤔 I forgor',
    'apply': '✅ Apply Default Filters',
    'save': '💾 Set Default Filters',
    'hide': '🫣 Hide Works',
    'search': '🔍︎ Search Bar',
    'settings': '⚙️ Settings'
  };

  function createOption(val) {
    const option = document.createElement('option');
    option.value = val;
    option.textContent = modeTextMap[val];
    return option;
  }

  async function showPopup() {
    const settings = await window.AO3Popup.getSettings();
    const isMobile = window.innerWidth <= 768;

    let popupOptions = settings.popupOptions || [];
    const allModes = Object.keys(modeTextMap);
    if (!('popupOptions' in settings)) {
      popupOptions = allModes;
    } else {
      popupOptions = ["", ...popupOptions, "settings"];
    }

    const content = document.createElement('div');
    content.style.cssText = isMobile
      ? 'flex: 1; padding-top: 1em;'
      : 'padding: 1em;';

    const label = document.createElement('label');
    label.textContent = 'Select mode:';
    label.style.cssText = `
      color: #ccc;
      display: block;
      margin-bottom: 0.5em;
      font-size: ${isMobile ? '1rem' : '0.95rem'};
    `;
    content.appendChild(label);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      font-size: ${isMobile ? '16px' : '0.95rem'};
      border: 1px solid #555;
      border-radius: 4px;
      background-color: #2a2a3d;
      color: white;
      box-sizing: border-box;
    `;

    popupOptions.forEach(val => select.appendChild(createOption(val)));

    select.addEventListener('change', () => {
      browser.runtime.sendMessage({
        action: 'executeMode',
        mode: select.value,
      }).then(() => {
        document.getElementById(popupId)?.remove();
      });
    });

    content.appendChild(select);

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      extraStyles: isMobile
        ? 'max-height: 20vh; overflow-y: auto; display: flex; flex-direction: column;'
        : 'max-height: 70vh; overflow-y: auto;',
    });

    document.body.appendChild(popup);
  }
})();