/* eslint-disable no-unused-vars */
/* globals browser */
/* eslint-enable no-unused-vars */
import {
  saveSettings,
  getSettings,
  openModePopup,
  removeModePopup,
} from "./helper/popup";
import {
  MOBILE_MAX_WIDTH,
  optionsPopupHelper,
  resetInputs,
} from "./helper/popup_fields";

(() => {
  removeModePopup();

  const fields = {
    hideEntirely: {
      label: "Hide unwanted works entirely",
      type: "checkbox",
    },
    hideTags: {
      label: "🚫 Hide with Tag(s)",
      type: "textarea",
    },
    hideAuthor: {
      label: "🚫 Hide with Author(s)",
      type: "text",
    },
    hideWordUnder: {
      label: "🚫 Hide Under x Words",
      type: "number",
    },
    hideWordOver: {
      label: "🚫 Hide Over x Words",
      type: "number",
    },
    hideLanguage: {
      label: "🚫 Hide Works with Language",
      type: "text",
    },
    showLanguage: {
      label: "✅ Show Only Works with Language",
      type: "text",
    },
    hideCrossovers: {
      label: "🚫 Hide Works with these many Crossovers",
      type: "numberSpecial",
    },
  };

  async function openHideWorksPopup() {
    const settings = await getSettings();
    let workSettings = settings.workSettings || {};
    const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;

    // Create content with fields (no hint)
    const [inputsMap, contentContainer] = optionsPopupHelper(
      fields,
      isMobile,
      workSettings,
      false,
    );

    // Buttons
    const buttons = [
      {
        text: "Save",
        variant: "primary",
        onClick: async () => {
          // Update workSettings
          for (const [key, { input, type }] of Object.entries(inputsMap)) {
            workSettings[key] =
              type === "checkbox" ? input.checked : input.value;
          }
          settings.workSettings = workSettings;
          await saveSettings(settings);
          removeModePopup();
        },
      },
      {
        text: "Reset",
        variant: "danger",
        onClick: async () => {
          if (!confirm("Are you sure you want to reset?")) return;
          delete settings.workSettings;
          await saveSettings(settings);
          // Reset all inputs
          resetInputs(contentContainer, inputsMap);
        },
      },
    ];

    // Create popup
    openModePopup(isMobile, {
      content: contentContainer,
      buttons: buttons,
      extraClasses: isMobile ? [] : ["flush-bottom"],
    });
  }

  openHideWorksPopup();
})();
