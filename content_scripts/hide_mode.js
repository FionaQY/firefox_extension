/* eslint-disable no-unused-vars */
/* globals browser, AO3Popup */
/* eslint-enable no-unused-vars */
(() => {
  const popupId = 'ao3-hideworks-popup';
  document.getElementById(popupId)?.remove();

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
    const settings = await window.AO3Popup.getSettings();
    let workSettings = settings.workSettings || {};
    const isMobile = window.innerWidth <= 768;

    // Create content with fields (no hint)
    const [inputsMap, contentContainer] = window.AO3Popup.optionsPopupHelper(
      fields, isMobile, workSettings, false
    );

    // Buttons
    const buttons = [
      {
        text: 'Save',
        variant: 'primary',
        onClick: async () => {
          // Update workSettings
          for (const [key, { input, type }] of Object.entries(inputsMap)) {
            workSettings[key] = (type === 'checkbox') ? input.checked : input.value;
          }
          settings.workSettings = workSettings;
          await window.AO3Popup.saveSettings(settings);
          document.getElementById(popupId)?.remove();
        }
      },
      {
        text: 'Reset',
        variant: 'danger',
        onClick: async () => {
          if (!confirm('Are you sure you want to reset?')) return;
          delete settings.workSettings;
          await window.AO3Popup.saveSettings(settings);
          // Reset all inputs
          window.AO3Popup.resetInputs(contentContainer, inputsMap);
        }
      }
    ];

    // Create popup
    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: contentContainer,
      buttons: buttons,
      extraClasses: isMobile ? [] : ['flush-bottom']
    });

    document.body.appendChild(popup);
  }

  openHideWorksPopup();
})();