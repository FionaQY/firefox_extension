/* globals browser */
(() => {
  const popupId = 'ao3-filter-popup';
  document.getElementById(popupId)?.remove();

  const fields = {
    query: {
      label: '🔍 Plain Search',
      type: 'text',
    },
    sort_column: {
      label: '⇅ Sort By',
      type: 'select',
      options: {
        '': "Don't Apply",
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
        '': "Don't Apply",
        all: 'All',
        F: 'Exclude Crossovers',
        T: 'Show only Crossovers',
      },
    },
    complete: {
      label: '🏁/⏳ Completed',
      type: 'select',
      options: {
        '': "Don't Apply",
        all: 'All',
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
      label: '🚫👤 Excluded Creators',
      type: 'text',
    },
  };

  async function saveFilterValue(key, value) {
    const settings = await window.AO3Popup.getSettings();
    if (!settings.filters) settings.filters = {};
    settings.filters[key] = value;
    await window.AO3Popup.saveSettings(settings);
  }

  async function openFilterPopup() {
    const settings = await window.AO3Popup.getSettings();
    const filters = settings.filters || {};
    const isMobile = window.innerWidth <= 768;

    const [inputsMap, contentContainer] = window.AO3Popup.optionsPopupHelper(
      fields, isMobile, filters, true // show hint
    );

    for (const [key, { input }] of Object.entries(inputsMap)) {
      input.addEventListener('change', () => {
        const value = input.type === 'checkbox' ? input.checked : input.value;
        saveFilterValue(key, value);
      });
    }

    const buttons = [
      {
        text: 'Apply Filters Now',
        variant: 'primary',
        onClick: () => {
          browser.runtime.sendMessage({ action: 'applyFilters' });
        }
      },
      {
        text: 'Reset Filters',
        variant: 'danger',
        onClick: async () => {
          if (!confirm('Are you sure you want to clear all saved filter values?')) return;
          const currentSettings = await window.AO3Popup.getSettings();
          delete currentSettings.filters;
          await window.AO3Popup.saveSettings(currentSettings);
          window.AO3Popup.resetInputs(contentContainer, inputsMap);
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

  openFilterPopup();
})();