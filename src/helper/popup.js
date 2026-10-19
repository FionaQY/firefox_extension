/* globals browser */

const SELECTORS = {
  POPUP_BY_ID_SUFFIX: '[id$="-popup"]',
};

export const MODE_POPUP_ID = "ao3-qof-popup";

const ID = {
  NOTIFICATION: "ao3-qof-notif-popup",
};

const CLASS = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
  NOTIFICATION: "ao3-notif-popup",
  BUTTON_BAR: "ao3-button-bar",
  BAR_BUTTON: "ao3-bar-button",
  CLOSE_BUTTON: "ao3-close-button",
  POPUP_CONTAINER: "ao3-popup-container",
};

const NOTIFICATION = { DURATION_MS: 3000, EDGE_PADDING: 10 };

export function createNotifPopup(message) {
  document.getElementById(ID.NOTIFICATION)?.remove();

  const popup = document.createElement("div");
  popup.id = ID.NOTIFICATION;
  popup.classList.add(CLASS.NOTIFICATION);
  popup.textContent = message;

  document.body.appendChild(popup);
  const popupRect = popup.getBoundingClientRect();

  const maxLeft = Math.max(
    0,
    window.innerWidth - popupRect.width - 2 * NOTIFICATION.EDGE_PADDING,
  );
  const maxTop = Math.max(
    0,
    window.innerHeight - popupRect.height - 2 * NOTIFICATION.EDGE_PADDING,
  );
  const randomLeft =
    Math.floor(Math.random() * maxLeft) + NOTIFICATION.EDGE_PADDING;
  const randomTop =
    Math.floor(Math.random() * maxTop) + NOTIFICATION.EDGE_PADDING;

  popup.style.left = `${randomLeft}px`;
  popup.style.top = `${randomTop}px`;

  const timer = setTimeout(() => popup.remove(), NOTIFICATION.DURATION_MS);

  const clickHandler = () => {
    clearTimeout(timer);
    popup.remove();
  };
  document.body.addEventListener("click", clickHandler, { once: true });
}

export function getButton(variant, isMobile, text) {
  const butt = document.createElement("button");
  butt.type = "button";
  butt.textContent = text;
  butt.classList.add(CLASS.BAR_BUTTON, `ao3-${variant || "neutral"}`);
  if (isMobile) {
    butt.classList.add(CLASS.MOBILE);
  }
  return butt;
}

export function createCloseButton(isMobile, onClose) {
  const btn = document.createElement("button");
  btn.textContent = "×";
  btn.classList.add(
    CLASS.CLOSE_BUTTON,
    isMobile ? CLASS.MOBILE : CLASS.DESKTOP,
  );
  btn.onclick = () => {
    if (onClose) onClose();
    else {
      const popup = btn.closest(SELECTORS.POPUP_BY_ID_SUFFIX);
      if (popup) popup.remove();
    }
  };
  return btn;
}

/**
 * Creates a horizontal button bar from an array of button definitions.
 * @param {Array} buttons - Array of { text, variant, onClick }.
 * @param {boolean} isMobile - Whether the device is mobile.
 * @returns {HTMLDivElement}
 */
export function createButtonBar(buttons, isMobile) {
  const container = document.createElement("div");
  container.classList.add(CLASS.BUTTON_BAR);
  buttons.forEach((btnDef) => {
    const btn = getButton(btnDef.variant, isMobile, btnDef.text);
    btn.addEventListener("click", btnDef.onClick);
    container.appendChild(btn);
  });
  return container;
}

export function createPopupContainer(id, isMobile, options = {}) {
  const popup = document.createElement("div");
  popup.id = id;
  popup.classList.add(
    CLASS.POPUP_CONTAINER,
    isMobile ? CLASS.MOBILE : CLASS.DESKTOP,
  );
  if (options.extraClasses) {
    popup.classList.add(...options.extraClasses);
  }

  popup.appendChild(createCloseButton(isMobile, options.onClose));

  if (options.content) {
    popup.appendChild(options.content);
  }

  if (options.buttons && options.buttons.length) {
    popup.appendChild(createButtonBar(options.buttons, isMobile));
  }
  return popup;
}

export function removeModePopup() {
  document.getElementById(MODE_POPUP_ID)?.remove();
}

export function openModePopup(isMobile, options = {}) {
  removeModePopup();
  const popup = createPopupContainer(MODE_POPUP_ID, isMobile, options);
  document.body.appendChild(popup);
  return popup;
}

export async function getSettings() {
  const { settings = {} } = await browser.storage.local.get("settings");
  return settings;
}

export async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

export function parseHtmlFragment(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  for (const node of Array.from(doc.body.childNodes)) {
    fragment.appendChild(node);
  }
  return fragment;
}
