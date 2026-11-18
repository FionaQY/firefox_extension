import { createButtonBar, createCloseButton } from "./popup_fields";

export const MODE_POPUP_ID = "ao3-qof-popup";

const ID = {
  NOTIFICATION: "ao3-qof-notif-popup",
};

export const MODE_ID = {
  SETTINGS: "settings",
  BLOCK: "block",
  FORGOT: "forgot",
  APPLY: "apply",
  SAVE: "save",
  HIDE: "hide",
  SEARCH: "search",
  DOWNLOAD: "download",
  DOWNLOADS: "downloads",
  STATUS: "status",
};

export const MODE_OPTIONS = {
  [MODE_ID.BLOCK]: { icon: "🚫", label: "Block Tag/Author" },
  [MODE_ID.FORGOT]: { icon: "🤔", label: "I forgor" },
  [MODE_ID.APPLY]: { icon: "✅", label: "Apply Default Filters" },
  [MODE_ID.SAVE]: { icon: "💾", label: "Set Default Filters" },
  [MODE_ID.HIDE]: { icon: "🫣", label: "Hide Works" },
  [MODE_ID.SEARCH]: { icon: "🔍", label: "Search Bar" },
  [MODE_ID.DOWNLOAD]: { icon: "📥", label: "Download Docx" },
  [MODE_ID.DOWNLOADS]: { icon: "📥📥📥", label: "Mass Downloads" },
  [MODE_ID.SETTINGS]: { icon: "⚙️", label: "Settings" },
};

const CLASS = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
  NOTIFICATION: "ao3-notif-popup",
  POPUP_HEADER: "ao3-popup-header",
  POPUP_CONTAINER: "ao3-popup-container",
  MODE_CONTENT: "ao3-mode-content",
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

function createPopupContainer(id, isMobile, options = {}) {
  const popup = document.createElement("div");
  popup.id = id;
  popup.classList.add(
    CLASS.POPUP_CONTAINER,
    isMobile ? CLASS.MOBILE : CLASS.DESKTOP,
  );
  if (options.extraClasses) {
    popup.classList.add(...options.extraClasses);
  }

  const header = document.createElement("div");
  header.classList.add(CLASS.POPUP_HEADER);
  header.appendChild(createCloseButton(isMobile, options.onClose));
  popup.appendChild(header);

  if (options.content) {
    options.content.classList.add(CLASS.MODE_CONTENT);
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
  const popup = createPopupContainer(MODE_POPUP_ID, isMobile, options);
  document.body.appendChild(popup);
  return popup;
}
