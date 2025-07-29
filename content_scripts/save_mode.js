(() => {
  console.log('AO3 Save Script injected successfully!');

  const fields = {
    query: {
      label: 'Plain Search',
      type: 'text',
    },
    sort_column: {
      label: 'Sort By',
      type: 'select',
      options: {
        created_at: 'Date Updated',
        revised_at: 'Date Published', 
        word_count: 'Word Count', 
        hits: 'Hits', 
        kudos: 'Kudos', 
        comments: 'Comments',
        bookmarks: 'Bookmarks',
      },
    },
    other_tag_names: {
      label: 'Included Tags',
      type: 'text',
    },
    excluded_tag_names: {
      label: 'Excluded Tags',
      type: 'text',
    },
    crossover: {
      label: 'Crossovers',
      type: 'select',
      options: {
        '': 'All', 
        F: 'Exclude Crossovers', 
        T: 'Show only Crossovers',
      },
    },
    complete: {
      label: 'Completed',
      type: 'select',
      options: {
        '': 'All', 
        T: 'Completed Works only',
        F: 'Exclude Crossovers', 
      },
    },
    includedLanguage: {
      label: 'Included Language',
      type: 'textarea',
    },
    excludedLanguage: {
      label: 'Excluded Language',
      type: 'textarea',
    },
    isSingleChapter: {
      label: 'Number of Chapters',
      type: 'select',
      options: {
        '': 'All', 
        'expected_number_of_chapters:1': 'Single-Chapter only',
        '-expected_number_of_chapters:1': 'Multi-Chapter only', 
      },
    },
    words_from: {
      label: 'Word Count From',
      type: 'number',
    },
    words_to: {
      label: 'Word Count To',
      type: 'number',
    },
    date_from: {
      label: 'Date Updated From',
      type: 'date',
    },
    date_to: {
      label: 'Date Updated To',
      type: 'date',
    },
    excludedCreators: {
      label: 'Excluded Creators',
      type: 'text',
    },
  };

  async function openTagPopup() {
    const popup = document.createElement('div');
    const isMobile = window.innerWidth <= 768;
    popup.style.cssText = `
      position: fixed;
      ${isMobile ? 
        'top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; border-radius: 0;' : 
        'top: 20px; right: 20px; max-width: 450px; border-radius: 8px;'
      }
      background: #1e1e2f;
      color: #eee;
      border: 1px solid #444;
      padding: 1em;
      ${isMobile ? 'padding-top: 2em;' : ''}
      max-height: ${isMobile ? '100vh' : '80vh'};
      overflow-y: auto;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      font-family: sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #555 #2e2e3e;
      -webkit-overflow-scrolling: touch;
    `;

    const headery = document.createElement('div');
    headery.innerHTML = `<div style="margin-bottom: 0.5em; font-weight: bold; margin-right: 2em;">If multiple values, please put a comma after each value.</div>`;
    popup.appendChild(headery);

    for (const [key, config] of Object.entries(fields)) {
      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        ${isMobile ? 'flex-direction: column; gap: 0.5em;' : 'align-items: center;'}
        margin-bottom: 0.75em;
      `;
      
      const label = document.createElement('label');
      label.textContent = `${config.label}:`;
      label.style.cssText = `
        ${isMobile ? '' : 'min-width: 160px;'}
        font-weight: bold;
        color: #ccc;
        font-size: ${isMobile ? '1rem' : 'clamp(0.95rem, 2.5vw, 1.1rem)'};
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
          break;
        case 'textarea':
          input = document.createElement('textarea');
          input.rows = 2;
          input.style.width = '100%';
          break;
        default:
          input = document.createElement('input');
          input.type = config.type;
      }

      input.style.cssText = config.type !== 'checkbox' 
          ? `
          ${isMobile ? 'width: 100%;' : 'flex: 1;'}
          padding: ${isMobile ? '12px' : '6px 8px'};
          font-size: ${isMobile ? '16px' : 'clamp(0.95rem, 2.5vw, 1.1rem)'};
          border: 1px solid #555;
          border-radius: 4px;
          background-color: #2a2a3d;
          color: white;
          box-sizing: border-box;
          ` : `
          width: ${isMobile ? '24px' : '18px'};
          height: ${isMobile ? '24px' : '18px'};
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
      popup.appendChild(container);
    }

    const handleClickOutside = (e) => {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    document.addEventListener('click', handleClickOutside);

    const buttonApply = document.createElement('button');
    buttonApply.textContent = 'Apply Filters';
    buttonApply.style.cssText = `
      width: 100%;
      margin-top: 1em;
      padding: ${isMobile ? '16px 12px' : '8px 12px'};
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: ${isMobile ? '18px' : '1rem'};
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
    popup.appendChild(buttonApply);
    
    document.body.appendChild(popup);
  }

  openTagPopup();
})();
