(() => {
  const popupId = 'ao3-hideworks-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  const fields = {
    hideEntirely: {
      label: 'Hide unwanted works entirely',
      type: 'checkbox',
    },
    hideTags: {
      label: '🚫 Hide with Tag(s)',
      type: 'textarea',
    },
    hideAuthor: {
      label: '🚫 Hide with Author(s)',
      type: 'text',
    },
    hideWordUnder: {
      label: '🚫 Hide Under x Words',
      type: 'number',
    },
    hideWordOver: {
      label: '🚫 Hide Over x Words',
      type: 'number',
    },
    hideLanguage: {
      label: '🚫 Hide Works with Language',
      type: 'text',
    },
    showLanguage: {
      label: '✅ Show Only Works with Language',
      type: 'text',
    },
    hideCrossovers: {
      label: '🚫 Hide Works with these many Crossovers',
      type: 'numberSpecial',
    }
  };

  async function openHideWorksPopup() {
    const { settings = {} } = await browser.storage.local.get('settings');
    let workSettings = settings.workSettings || [];

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

    const [inputsMap, contentContainer] = window.AO3Popup.optionsPopupHelper(fields, isMobile, workSettings);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      gap: 1em;
      padding: 1em;
    `;

    const buttonSave = document.createElement('button');
    buttonSave.textContent = 'Save';
    buttonSave.style.cssText = `
      flex: 1;
      padding: '8px 12px';
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: ${isMobile ? '16px' : '0.95rem'};
      cursor: pointer;
      touch-action: manipulation;
    `;
    buttonSave.addEventListener('click', async () => {
      for (const [key, {input, type}] of Object.entries(inputsMap)) {
        workSettings[key] = (type == 'checkbox') ? input.checked : input.value;
      }
      settings.workSettings = workSettings
      await browser.storage.local.set({ settings }).then(() => popup.remove());
    });
    
    const buttonReset = document.createElement('button');
    buttonReset.textContent = 'Reset';
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
      if (confirm('Are you sure you want to reset?')) {
        delete settings["workSettings"];
        await browser.storage.local.set({ settings });
        
        const inputs = contentContainer.querySelectorAll('input');
        Array.from(inputs).forEach(x => x.type === 'checkbox' ? x.checked = false : x.value = '');
        const selects = contentContainer.querySelectorAll('select');
        Array.from(selects).forEach(x => x.selectedIndex = 0);
      }
    });

    buttonContainer.appendChild(buttonSave);
    buttonContainer.appendChild(buttonReset);
    popup.appendChild(contentContainer);
    popup.appendChild(buttonContainer);
    
    document.body.appendChild(popup);
  }

  openHideWorksPopup();
})();
