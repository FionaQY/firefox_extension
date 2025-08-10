(() => {
  const popupId = 'ao3-settings-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  const fields = {
    populateBookmark: {
      label: 'Automatically Populate Bookmark',
      type: 'checkbox',
    }
  };

  async function saveFilterValue(settings, key, value) {
    settings[key] = value;
    await browser.storage.local.set({ settings });
  }

  async function openSettingsPopup() {
    const { settings = {} } = await browser.storage.local.get('settings');

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

    for (const [key, config] of Object.entries(fields)) {
      const container = document.createElement('div');
      container.style.cssText = `
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
          
      if (config.type == 'checkbox') {
        input.checked = settings[key] || false;
      } else {
        input.value = settings[key] || input.value || '';
      }
      
      input.addEventListener('change', () => {
          const value = (config.type == 'checkbox') ? input.checked : input.value;
          saveFilterValue(settings, key, value);
          console.log("new val,", value);
        });

      container.appendChild(label);
      container.appendChild(input);
      contentContainer.appendChild(container);
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      gap: 1em;
      padding: 1em;
    `;
    
    const buttonReset = document.createElement('button');
    buttonReset.textContent = 'Reset All Settings';
    buttonReset.style.cssText = `
      flex: 1;
      padding: '8px 12px';
      background: #ee5555;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: ${isMobile ? '18px' : '1rem'};
      cursor: pointer;
    `;
    buttonReset.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset settings?')) {
        await browser.storage.local.remove('settings');
        const inputs = contentContainer.querySelectorAll('input');
        Array.from(inputs).forEach(x => x.type === 'checkbox' ? x.checked = false : x.value = '');
        const selects = contentContainer.querySelectorAll('select');
        Array.from(selects).forEach(x => x.selectedIndex = 0);
      }
    });

    buttonContainer.appendChild(buttonReset);
    popup.appendChild(contentContainer);
    popup.appendChild(buttonContainer);
    
    document.body.appendChild(popup);
  }

  openSettingsPopup();
})();
