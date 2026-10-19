/* globals */

import {
  saveSettings,
  getSettings,
  createNotifPopup,
  openModePopup,
  removeModePopup,
  MODE_ID,
  MODE_OPTIONS,
} from "./helper/popup";
import {
  MOBILE_MAX_WIDTH,
  optionsPopupHelper,
  resetInputs,
} from "./helper/popup_fields";
(() => {
  removeModePopup();

  const fields = {
    populateBookmark: {
      label: "Automatically Populate Bookmark",
      type: "checkbox",
    },
    overrideBookmark: {
      label: "Populate Bookmark even if filled",
      type: "checkbox",
    },
    shrinkWorks: {
      label: "Shrink Works",
      type: "checkbox",
    },
    downloadWorks: {
      label: "Mass Download Works as docx",
      type: "checkbox",
    },
    bookmarkWorks: {
      label: "Mass Bookmark Works",
      type: "checkbox",
    },
  };

  function createColumn(title) {
    const isShow = title === "Show";
    const col = document.createElement("div");
    col.classList.add("ao3-drop-column", isShow ? "show" : "hide");

    const header = document.createElement("div");
    header.textContent = isShow
      ? "✅ Show (click to hide)"
      : "🚫 Hide (click to show)";
    header.classList.add("ao3-drop-column-header");

    col.appendChild(header);
    return col;
  }

  function createItem(text, value, showCol, hideCol) {
    const item = document.createElement("div");
    item.textContent = text;
    item.id = value;
    item.draggable = true;
    item.classList.add("ao3-drop-item");

    item.addEventListener("click", () => {
      const parent = item.parentElement;
      const targetCol = parent === showCol ? hideCol : showCol;
      targetCol.appendChild(item);
    });

    return item;
  }

  function populateCols(settings, showCol, hideCol) {
    const all_modes = Object.keys(MODE_OPTIONS)
      .filter((mode) => mode !== MODE_ID.SETTINGS)
      .map((mode) => [
        mode,
        `${MODE_OPTIONS[mode].icon} ${MODE_OPTIONS[mode].label}`,
      ]);
    const popupOptions = settings.popupOptions || all_modes;
    showCol.innerHTML = "";
    hideCol.innerHTML = "";

    for (const [val, opt] of all_modes) {
      const item = createItem(opt, val, showCol, hideCol);
      if (popupOptions.includes(val)) {
        showCol.appendChild(item);
      } else {
        hideCol.appendChild(item);
      }
    }
  }

  async function openSettingsPopup() {
    const settings = await getSettings();
    const generalSettings = { ...(settings.general || {}) };
    const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;

    const [inputsMap, contentContainer] = optionsPopupHelper(
      fields,
      isMobile,
      generalSettings,
      false /* no hint */,
    );

    // Drag-drop columns
    const dragDropContainer = document.createElement("div");
    dragDropContainer.classList.add("ao3-drop-container");
    const showCol = createColumn("Show");
    const hideCol = createColumn("Hide");
    populateCols(settings, showCol, hideCol);
    dragDropContainer.appendChild(showCol);
    dragDropContainer.appendChild(hideCol);
    contentContainer.appendChild(dragDropContainer);

    // Button definitions
    const buttons = [
      {
        text: "📋 Copy Settings",
        variant: "neutral",
        onClick: async (e) => {
          const btn = e.target;
          const currentSettings = await getSettings();
          const json = JSON.stringify(currentSettings, null, 5);
          await navigator.clipboard.writeText(json);
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = "✓ Copied!";
            setTimeout(() => {
              btn.textContent = originalText;
            }, 3000);
          }
        },
      },
      {
        text: "📋 Paste/Override",
        variant: "success",
        onClick: async () => {
          const text = await navigator.clipboard.readText();
          if (!text || text.length === 0) return;
          if (confirm("This will override all settings and filters.")) {
            try {
              const imported = JSON.parse(text);
              if (typeof imported !== "object" || imported === null) {
                throw new Error("Invalid settings format");
              }
              await saveSettings(imported);
              removeModePopup();
            } catch {
              createNotifPopup("Invalid settings format");
            }
          }
        },
      },
      {
        text: "Save",
        variant: "primary",
        onClick: async () => {
          for (const [key, { input, type }] of Object.entries(inputsMap)) {
            generalSettings[key] =
              type === "checkbox" ? input.checked : input.value;
          }

          const popupOptions = Array.from(showCol.childNodes)
            .filter((x) => x.id.length !== 0)
            .map((x) => x.id);
          settings.popupOptions = popupOptions;
          settings.general = generalSettings;
          await saveSettings(settings);
          removeModePopup();
        },
      },
      {
        text: "Reset",
        variant: "danger",
        onClick: async () => {
          if (!confirm("Are you sure you want to reset Settings?")) return;
          delete settings.general;
          delete settings.popupOptions;
          await saveSettings(settings);

          resetInputs(contentContainer, inputsMap);
          populateCols({}, showCol, hideCol);
        },
      },
    ];

    openModePopup(isMobile, {
      content: contentContainer,
      buttons: buttons,
      extraClasses: isMobile ? [] : ["flush-bottom"],
    });
  }

  openSettingsPopup();
})();
