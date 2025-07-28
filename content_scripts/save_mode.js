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
        '': 'Include Crossovers', 
        F: 'Exclude Crossovers', 
        T: 'Show only Crossovers',
      },
    },
    complete: {
      label: 'Completed',
      type: 'select',
      options: {
        '': 'Include Crossovers', 
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
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e1e2f;
      color: #eee;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 1em;
      max-width: 450px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      font-family: sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #555 #2e2e3e;
    `;

    const headery = document.createElement('div');
    headery.innerHTML = `<div style="margin-bottom: 0.5em; font-weight: bold;">If multiple values, please put a comma after each value.</div>`;
    popup.appendChild(headery);

    for (const [key, config] of Object.entries(fields)) {
      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 0.75em;
      `;
      
      const label = document.createElement('label');
      label.textContent = `${config.label}:`;
      label.style.cssText = `
        min-width: 160px;
        font-weight: bold;
        color: #ccc;
        font-size: clamp(0.95rem, 2.5vw, 1.1rem);
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

      if (config.type !== 'checkbox') {
        input.style.cssText = `
          flex: 1;
          padding: 6px 8px;
          font-size: clamp(0.95rem, 2.5vw, 1.1rem);
          border: 1px solid #555;
          border-radius: 4px;
          background-color: #2a2a3d;
          color: white;
        `;
      } else {
        input.style.cssText = `
            width: 18px;
            height: 18px;
            accent-color: #ee5555;
            cursor: pointer;
          `;
      }

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

    document.body.appendChild(popup);
  }

  openTagPopup();
  
})();
