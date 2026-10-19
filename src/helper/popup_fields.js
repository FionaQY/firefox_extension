export const MOBILE_MAX_WIDTH = 768;

const INPUT_TYPE = {
  SELECT: "select",
  NUMBER_SPECIAL: "numberSpecial",
  TEXTAREA: "textarea",
  CHECKBOX: "checkbox",
  RADIO: "radio",
  TEXT: "text",
};

const CLASS = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
  CHECKBOX: "checkbox",
  ACTIVE: "active",
  OPTIONS_CONTENT: "ao3-options-content",
  OPTIONS_HINT: "ao3-options-hint",
  FIELD_CONTAINER: "ao3-field-container",
  FIELD_LABEL: "ao3-field-label",
  FIELD_INPUT: "ao3-field-input",
  FIELD_CHECKBOX: "ao3-field-checkbox",
  SEARCH_BAR: "ao3-search-bar",
  SEARCH_INPUT: "ao3-search-input",
  SEARCH_BUTTON: "ao3-search-button",
  LABELED_CHECKBOX: "ao3-labeled-checkbox",
};

const MESSAGE = {
  MULTIPLE_VALUES_HINT:
    "If multiple values, please put a comma after each value.",
  NUMBER_EXAMPLE: "e.g. >1, 1, ([5 TO 20] !(7 || 13))",
};

const SELECTOR = {
  RESETTABLE_INPUTS: "input, select, textarea",
};

function createInput(config) {
  let input;
  switch (config.type) {
    case INPUT_TYPE.SELECT:
      input = document.createElement("select");
      for (const [value, label] of Object.entries(config.options)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        input.appendChild(option);
      }
      input.selectedIndex = 0;
      break;

    case INPUT_TYPE.NUMBER_SPECIAL:
      input = document.createElement("input");
      input.type = INPUT_TYPE.TEXT;
      input.placeholder = MESSAGE.NUMBER_EXAMPLE;
      break;

    case INPUT_TYPE.TEXTAREA:
      input = document.createElement("textarea");
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = `${input.scrollHeight}px`;
      });
      break;
    default:
      input = document.createElement("input");
      input.type = config.type;
  }
  return input;
}

function applyInputStyles(input, config, isMobile) {
  if (config.type === INPUT_TYPE.CHECKBOX) {
    input.classList.add(CLASS.FIELD_CHECKBOX);
    return;
  }

  input.classList.add(CLASS.FIELD_INPUT);
  if (isMobile) input.classList.add("mobile");
}

export function optionsPopupHelper(
  fields,
  isMobile,
  currSettings,
  showHint = false,
) {
  const container = document.createElement("div");
  container.classList.add(
    CLASS.OPTIONS_CONTENT,
    isMobile ? CLASS.MOBILE : CLASS.DESKTOP,
  );

  if (showHint) {
    const hint = document.createElement("div");
    hint.textContent = MESSAGE.MULTIPLE_VALUES_HINT;
    hint.classList.add(CLASS.OPTIONS_HINT);
    container.appendChild(hint);
  }

  const inputsMap = {};
  for (const [key, config] of Object.entries(fields)) {
    const fieldContainer = document.createElement("div");
    fieldContainer.classList.add(CLASS.FIELD_CONTAINER);
    if (config.type === INPUT_TYPE.CHECKBOX) {
      fieldContainer.classList.add(CLASS.CHECKBOX);
    }

    const label = document.createElement("label");
    label.textContent = `${config.label}`;
    label.classList.add(CLASS.FIELD_LABEL);
    if (config.type !== INPUT_TYPE.CHECKBOX && !isMobile) {
      label.classList.add(CLASS.DESKTOP);
    }

    const input = createInput(config);
    applyInputStyles(input, config, isMobile);

    if (config.type === INPUT_TYPE.CHECKBOX) {
      fieldContainer.append(input, label);
      input.checked = currSettings[key] || false;
    } else {
      fieldContainer.append(label, input);
      input.value = currSettings[key] || "";
    }

    inputsMap[key] = { input, type: config.type };
    container.appendChild(fieldContainer);
  }

  return [inputsMap, container];
}

export function resetInputs(container, inputsMap) {
  if (inputsMap) {
    for (const { input, type } of Object.values(inputsMap)) {
      if (type === INPUT_TYPE.CHECKBOX) input.checked = false;
      else input.value = "";
    }
    return;
  }

  container.querySelectorAll(SELECTOR.RESETTABLE_INPUTS).forEach((input) => {
    if (input.type === INPUT_TYPE.CHECKBOX || input.type === INPUT_TYPE.RADIO) {
      input.checked = false;
    } else if (input.tagName === INPUT_TYPE.SELECT.toUpperCase()) {
      input.selectedIndex = 0;
    } else {
      input.value = "";
    }
  });
}

export function createSearchBar(options = {}) {
  const {
    inputPlaceholder = "",
    inputValue = "",
    buttons = [],
    onInputChange = null,
    isMobile = window.innerWidth <= MOBILE_MAX_WIDTH,
  } = options;

  const container = document.createElement("div");
  container.classList.add(CLASS.SEARCH_BAR);

  const input = document.createElement("input");
  input.type = INPUT_TYPE.TEXT;
  input.placeholder = inputPlaceholder;
  input.value = inputValue;
  input.classList.add(CLASS.SEARCH_INPUT);
  if (isMobile) input.classList.add(CLASS.MOBILE);
  if (onInputChange) {
    input.addEventListener("input", (event) =>
      onInputChange(event.target.value),
    );
  }
  container.appendChild(input);

  for (const buttonDefinition of buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = buttonDefinition.text;
    button.classList.add(CLASS.SEARCH_BUTTON);
    if (isMobile) button.classList.add(CLASS.MOBILE);
    if (buttonDefinition.variant) {
      button.classList.add(`ao3-${buttonDefinition.variant}`);
    }
    if (buttonDefinition.active) button.classList.add(CLASS.ACTIVE);
    if (buttonDefinition.onClick) {
      button.addEventListener("click", buttonDefinition.onClick);
    }
    container.appendChild(button);
  }

  return container;
}

export function createLabeledCheckbox(id, text) {
  const label = document.createElement("label");
  label.classList.add(CLASS.LABELED_CHECKBOX);

  const input = document.createElement("input");
  input.type = INPUT_TYPE.CHECKBOX;
  input.id = id;

  label.append(input, document.createTextNode(` ${text}`));
  return label;
}
