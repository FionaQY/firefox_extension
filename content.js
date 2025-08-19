(() => {
  browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === 'showPopup') {
      await showPopup()      
    }
  });

  const popupId = 'ao3-qof-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  const modeTextMap = {
    '': '',
    'block': '🚫 Block tag/author',
    'forgot': '🤔 I forgor',
    'apply': '✅ Apply default filters',
    'save': '💾 Set default filters',
    'settings': '⚙️ Settings'
  };

  function createOption(val) {
    const option = document.createElement('option');
    option.value = val;
    option.textContent = modeTextMap[val];
    return option;
  }

  
  async function showPopup() {
    const { settings = {} } = await browser.storage.local.get('settings');
    
    let popupOptions = settings.popupOptions || [];
    const allModes = Object.keys(modeTextMap);
    if (!('popupOptions' in settings)) {
      popupOptions = allModes;
    } else {
      popupOptions = ["", ...popupOptions, "settings"];
    }

    const popup = document.createElement('div');
    popup.id = popupId;
    const isMobile = window.innerWidth <= 768;
    popup.style.cssText = `
      position: fixed;
      ${isMobile
        ? `
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          width: 100%; 
          max-height: 20vh;   /* max height: 80% viewport height */
          border-radius: 0; 
          padding: 1em 1em 0; 
          display: flex; 
          flex-direction: column;
          overflow-y: auto;
        `
        : `
          top: 20px; 
          right: 20px; 
          width: 300px; 
          max-height: 70vh;
          border-radius: 8px;
          overflow-y: auto;
        `
      }
      background: #1e1e2f;
      color: #eee;
      border: 1px solid #444;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      font-family: sans-serif;
      box-sizing: border-box;
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
        buttonClose.style.background = 'transparent';
        buttonClose.style.color = '#ccc';
    });
    buttonClose.onclick = () => popup.remove();
    popup.appendChild(buttonClose);

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

    const input = document.createElement('select');
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

    popupOptions.forEach(x => input.appendChild(createOption(x)));

    input.addEventListener('change', () => {
        browser.runtime.sendMessage({
            action: 'executeMode',
            mode: input.value,
        }).then(() => {
            popup.remove();
          });
        });

    content.appendChild(input);

    popup.appendChild(content);
    document.body.appendChild(popup);
  }

})();
