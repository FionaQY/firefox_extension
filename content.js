/* globals browser */
import {
  createNotifPopup,
  getSettings,
  openModePopup,
  MODE_ID,
  MODE_OPTIONS,
} from "./src/helper/popup";
import { MOBILE_MAX_WIDTH } from "./src/helper/popup_fields";

const ACTION = { EXECUTE_MODE: "executeMode" };
const CLASS = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
  MODE_BUTTON: "ao3-mode-button",
  MODE_ICON: "ao3-mode-button-icon",
  MODE_LABEL: "ao3-mode-button-text",
  CONTENT: "ao3-popup-content",
  LABEL: "ao3-popup-label",
  BUTTON_GRID: "ao3-button-grid",
  MODE_CONTAINER: "modes",
};

const MESSAGE = {
  SELECT_MODE: "Select mode:",
  MODE_START_ERROR: (mode, reason) => `Could not start ${mode} mode: ${reason}`,
};

function getPopupOptions(settings) {
  if (!("popupOptions" in settings)) return Object.keys(MODE_OPTIONS);
  return [...(settings.popupOptions || []), MODE_ID.SETTINGS];
}

function createModeButton(mode, isMobile, popup) {
  const { icon = "", label = "" } = MODE_OPTIONS[mode] || {};
  const deviceClass = isMobile ? CLASS.MOBILE : CLASS.DESKTOP;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.mode = mode;
  button.classList.add(CLASS.MODE_BUTTON, deviceClass);

  const iconElement = document.createElement("div");
  iconElement.textContent = icon;
  iconElement.classList.add(CLASS.MODE_ICON, deviceClass);

  const labelElement = document.createElement("div");
  labelElement.textContent = label;
  labelElement.classList.add(CLASS.MODE_LABEL, deviceClass);
  button.append(iconElement, labelElement);

  button.addEventListener("click", () => {
    browser.runtime
      .sendMessage({ action: ACTION.EXECUTE_MODE, mode })
      .then(() => popup.remove())
      .catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        createNotifPopup(MESSAGE.MODE_START_ERROR(mode, reason));
      });
  });

  return button;
}

async function showPopup() {
  const settings = await getSettings();
  const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
  const deviceClass = isMobile ? CLASS.MOBILE : CLASS.DESKTOP;
  const popupOptions = getPopupOptions(settings);

  const content = document.createElement("div");
  content.classList.add(CLASS.CONTENT, deviceClass);

  const label = document.createElement("label");
  label.textContent = MESSAGE.SELECT_MODE;
  label.classList.add(CLASS.LABEL, deviceClass);

  const grid = document.createElement("div");
  grid.classList.add(CLASS.BUTTON_GRID, deviceClass);

  const popup = openModePopup(isMobile, {
    content,
    extraClasses: [CLASS.MODE_CONTAINER],
  });

  for (const mode of popupOptions.filter(Boolean)) {
    grid.appendChild(createModeButton(mode, isMobile, popup));
  }
  content.append(label, grid);
  document.body.appendChild(popup);
}

(() => {
  function injectStyles() {
    const styleId = "ao3-qof-styles";
    if (document.getElementById(styleId)) return;

    const link = document.createElement("link");
    link.id = styleId;
    link.rel = "stylesheet";
    link.href = browser.runtime.getURL("styles.css");
    document.head.appendChild(link);
  }

  injectStyles();
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "showPopup") {
      await showPopup();
    }
  });
})();
