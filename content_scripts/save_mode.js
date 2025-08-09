(() => {
  console.log('AO3 Save Script injected successfully!');

  const fields = {
    query: {
      label: '🔍 Plain Search',
      type: 'text',
    },
    sort_column: {
      label: '⇅ Sort By',
      type: 'select',
      options: {
        revised_at: 'Date Updated',
        created_at: 'Date Published', 
        word_count: 'Word Count', 
        hits: 'Hits', 
        kudos_count: 'Kudos', 
        comments_count: 'Comments',
        bookmarks_count: 'Bookmarks',
        authors_to_sort_on: 'Author',
        title_to_sort_on: 'Title'
      },
    },
    other_tag_names: {
      label: '🏷️ Included Tags',
      type: 'text',
    },
    excluded_tag_names: {
      label: '🚫 Excluded Tags',
      type: 'text',
    },
    crossover: {
      label: '🔗 Crossovers',
      type: 'select',
      options: {
        '': 'All', 
        F: 'Exclude Crossovers', 
        T: 'Show only Crossovers',
      },
    },
    complete: {
      label: '🏁/⏳ Completed',
      type: 'select',
      options: {
        '': 'All', 
        T: '🏁 Completed only',
        F: '⏳ In-Progress only', 
      },
    },
    language_id: {
      label: '🈹 Included Language',
      type: 'text',
    },
    "-language_id": {
      label: '🤫 Excluded Language',
      type: 'text',
    },
    major_version: {
      label: '📖 Current Chapter Count*',
      type: 'numberSpecial',
    },
    expected_number_of_chapters: {
      label: '📕 Total Number of Chapters',
      type: 'numberSpecial',
    },
    words_from: {
      label: '📏 Word Count From',
      type: 'number',
    },
    words_to: {
      label: '📏 Word Count To',
      type: 'number',
    },
    date_from: {
      label: '📅 Date Updated From',
      type: 'date',
    },
    date_to: {
      label: '📅 Date Updated To',
      type: 'date',
    },
    "-creators": {
      label: '	🚫👤 Excluded Creators',
      type: 'text',
    },
  };
  const popupId = 'ao3-summary-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  async function openTagPopup() {
    const popup = document.createElement('div');
    popup.id = popupId;
    const isMobile = window.innerWidth <= 768;
    popup.style.cssText = `
      position: fixed;
      ${isMobile ? 
        'top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; border-radius: 0; padding: 1em 1em 0; padding-top: 3em;' : 
        'top: 20px; right: 20px; width: 380px; border-radius: 8px;' 
      }
      background: #1e1e2f;
      color: #eee;
      border: 1px solid #444;
      max-height: ${isMobile ? '100vh' : '80vh'};
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
        font-size: ${isMobile ? '0.9rem' : '0.95rem'};
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

      await browser.storage.local.get(key).then(res => {
        if (config.type == 'checkbox') {
          input.checked = res[key] ?? false;
        } else {
          input.value = res[key] || '';
        }
      });
      
      input.addEventListener('change', () =>
        {
          const value = (config.type == 'checkbox') ? input.checked : input.value;
          browser.storage.local.set({[key]: value});
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
      ${isMobile ? 'flex-direction: column;' : ''}
    `;

    const buttonApply = document.createElement('button');
    buttonApply.textContent = 'Apply Filters Now';
    buttonApply.style.cssText = `
      flex: 1;
      padding: ${isMobile ? '16px 12px' : '8px 12px'};
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: ${isMobile ? '16px' : '0.95rem'};
      cursor: pointer;
      touch-action: manipulation;
    `;
    buttonApply.addEventListener('mouseenter', () => {
      buttonApply.style.background = '#357abd';
    });
    buttonApply.addEventListener('mouseleave', () => {
      buttonApply.style.background = '#4a90e2';
    });
    buttonApply.onclick = () => {
      browser.runtime.sendMessage({
        action: 'applyFilters',
      });
    };
    const buttonReset = document.createElement('button');
    buttonReset.textContent = 'Reset All Filters';
    buttonReset.style.cssText = `
      flex: 1;
      padding: ${isMobile ? '16px 12px' : '8px 12px'};
      background: #ee5555;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: ${isMobile ? '18px' : '1rem'};
      cursor: pointer;
    `;
    buttonReset.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all saved filter values?')) {
        await browser.storage.local.clear();
        const inputs = contentContainer.querySelectorAll('input');
        Array.from(inputs).forEach(x => x.type === 'checkbox' ? x.checked = false : x.value = '');
        const selects = contentContainer.querySelectorAll('select');
        Array.from(selects).forEach(x => x.selectedIndex = 0);
      }
    });

    buttonContainer.appendChild(buttonApply);
    buttonContainer.appendChild(buttonReset);
    popup.appendChild(contentContainer);
    popup.appendChild(buttonContainer);
    
    document.body.appendChild(popup);
  }

  openTagPopup();
})();
