/* globals browser */

function createInput(config) {
  let input;
  switch (config.type) {
    case "select":
      input = document.createElement("select");
      for (const [val, opt] of Object.entries(config.options)) {
        const option = document.createElement("option");
        option.value = val;
        option.textContent = opt;
        input.appendChild(option);
      }
      input.selectedIndex = 0;
      break;
    case "numberSpecial":
      input = document.createElement("input");
      input.type = "text";
      input.placeholder = "e.g. >1, 1, ([5 TO 20] !(7 || 13))";
      break;
    case "textarea":
      input = document.createElement("textarea");
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
      });
      break;
    default:
      input = document.createElement("input");
      input.type = config.type;
  }
  return input;
}

function applyInputStyles(input, config, isMobile) {
  if (config.type !== "checkbox") {
    input.classList.add("ao3-field-input");
    if (isMobile) {
      input.classList.add("mobile");
    }
  } else {
    input.classList.add("ao3-field-checkbox");
  }
}

export function createNotifPopup(msg) {
  const popupId = "ao3-qof-notif-popup";
  document.getElementById(popupId)?.remove();

  const popup = document.createElement("div");
  popup.id = popupId;
  popup.classList.add("ao3-notif-popup");
  popup.textContent = msg;

  document.body.appendChild(popup);
  const popupRect = popup.getBoundingClientRect();

  const maxLeft = Math.max(0, window.innerWidth - popupRect.width - 20);
  const maxTop = Math.max(0, window.innerHeight - popupRect.height - 20);
  const randomLeft = Math.floor(Math.random() * maxLeft) + 10;
  const randomTop = Math.floor(Math.random() * maxTop) + 10;

  popup.style.left = `${randomLeft}px`;
  popup.style.top = `${randomTop}px`;

  const timer = setTimeout(() => popup.remove(), 3000);

  const clickHandler = () => {
    clearTimeout(timer);
    popup.remove();
  };
  document.body.addEventListener("click", clickHandler, { once: true });
}

export function optionsPopupHelper(
  fields,
  isMobile,
  currSettings,
  showHint = false,
) {
  const container = document.createElement("div");
  container.classList.add(
    "ao3-options-content",
    isMobile ? "mobile" : "desktop",
  );

  if (showHint) {
    const hint = document.createElement("div");
    hint.textContent =
      "If multiple values, please put a comma after each value.";
    hint.classList.add("ao3-options-hint");
    container.appendChild(hint);
  }

  const inputsMap = {};
  for (const [key, config] of Object.entries(fields)) {
    const fieldContainer = document.createElement("div");
    fieldContainer.classList.add("ao3-field-container");
    if (config.type === "checkbox") {
      fieldContainer.classList.add("checkbox");
    }

    const label = document.createElement("label");
    label.textContent = `${config.label}:`;
    label.classList.add("ao3-field-label");
    if (config.type !== "checkbox" && !isMobile) {
      label.classList.add("desktop");
    }

    const input = createInput(config);
    applyInputStyles(input, config, isMobile);

    if (config.type === "checkbox") {
      fieldContainer.appendChild(input);
      fieldContainer.appendChild(label);
      input.checked = currSettings[key] || false;
    } else {
      fieldContainer.appendChild(label);
      fieldContainer.appendChild(input);
      input.value = currSettings[key] || "";
    }

    inputsMap[key] = { input, type: config.type };
    container.appendChild(fieldContainer);
  }

  return [inputsMap, container];
}

export function getButton(variant, isMobile, text) {
  const butt = document.createElement("button");
  butt.type = "button";
  butt.textContent = text;
  butt.classList.add("ao3-bar-button", `ao3-${variant || "neutral"}`);
  if (isMobile) {
    butt.classList.add("mobile");
  }
  return butt;
}

export function createCloseButton(isMobile, onClose) {
  const btn = document.createElement("button");
  btn.textContent = "×";
  btn.classList.add("ao3-close-button", isMobile ? "mobile" : "desktop");
  btn.onclick = () => {
    if (onClose) onClose();
    else {
      const popup = btn.closest(`[id$="-popup"]`);
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
  container.classList.add("ao3-button-bar");
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
  popup.classList.add("ao3-popup-container", isMobile ? "mobile" : "desktop");
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

export async function getSettings() {
  const { settings = {} } = await browser.storage.local.get("settings");
  return settings;
}

export async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

export function resetInputs(container, inputsMap) {
  if (inputsMap) {
    for (const { input, type } of Object.values(inputsMap)) {
      if (type === "checkbox") input.checked = false;
      else input.value = "";
    }
  } else {
    const inputs = container.querySelectorAll("input, select, textarea");
    inputs.forEach((el) => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });
  }
}

export function parseHtmlFragment(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  for (const node of Array.from(doc.body.childNodes)) {
    fragment.appendChild(node);
  }
  return fragment;
}

/**
 * Creates a search bar with an input field and buttons on the right.
 * @param {Object} options
 * @param {string} options.inputPlaceholder
 * @param {string} options.inputValue
 * @param {Array} options.buttons - { text, variant, onClick, active? }.
 * @param {Function} [options.onInputChange]
 * @param {boolean} [options.isMobile]
 * @returns {HTMLDivElement}
 */
export function createSearchBar(options = {}) {
  const {
    inputPlaceholder = "",
    inputValue = "",
    buttons = [],
    onInputChange = null,
    isMobile = window.innerWidth <= 768,
  } = options;

  const container = document.createElement("div");
  container.classList.add("ao3-search-bar");

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = inputPlaceholder;
  input.value = inputValue;
  input.classList.add("ao3-search-input");
  if (isMobile) {
    input.classList.add("mobile");
  }
  if (onInputChange) {
    input.addEventListener("input", (e) => onInputChange(e.target.value));
  }
  container.appendChild(input);

  buttons.forEach((btnDef) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = btnDef.text;
    btn.classList.add("ao3-search-button");
    if (isMobile) {
      btn.classList.add("mobile");
    }
    if (btnDef.variant) {
      btn.classList.add(`ao3-${btnDef.variant}`);
    }
    if (btnDef.active) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", (e) => {
      if (btnDef.onClick) {
        btnDef.onClick(e);
      }
    });
    container.appendChild(btn);
  });

  return container;
}

export function createLabeledCheckbox(id, text) {
  const label = document.createElement("label");
  label.classList.add("ao3-labeled-checkbox");

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;

  label.append(input, document.createTextNode(` ${text}`));
  return label;
}
