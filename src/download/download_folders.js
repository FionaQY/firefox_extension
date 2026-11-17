import { createNotifPopup } from "../ui/popup";
import { getSettings, saveSettings } from "../storage/settings";
import {
  DEFAULT_FOLDER_TYPE,
  FOLDER_FIELDS,
  isValidPattern,
  normalizeFolderType,
} from "./folder_rules";
import { el, button, checkboxField } from "./download_dom";

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const splitValues = (text) =>
  String(text)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

function toDraft(rule) {
  return {
    id: rule.id || newId(),
    name: rule.name || "",
    type: normalizeFolderType(rule.type ?? DEFAULT_FOLDER_TYPE),
    regex: Boolean(rule.regex),
    valuesText: (rule.values || []).join(", "),
  };
}

export function buildFoldersView({ isMobile }) {
  const inputClass = `ao3-field-input${isMobile ? " mobile" : ""}`;
  const state = { enabled: false, rules: [] };
  let dragIndex = null;

  const element = el("div", "ao3-folder-content");
  const list = el("div");

  function move(from, to) {
    if (to < 0 || to >= state.rules.length || from === to) return;
    const [rule] = state.rules.splice(from, 1);
    state.rules.splice(to, 0, rule);
    renderRows();
  }

  /** Checkbox dropdown for fields with a fixed set of AO3 values. */
  function buildOptionsDropdown(rule, options) {
    const typed = splitValues(rule.valuesText).map((v) => v.toLowerCase());
    const selected = new Set(
      options.filter((option) => typed.includes(option.toLowerCase())),
    );

    const details = el("details", "ao3-folder-dropdown ao3-folder-values");
    const summary = el("summary", `${inputClass} ao3-folder-summary`);
    const choices = el("div", "ao3-folder-options");

    const sync = () => {
      const chosen = options.filter((option) => selected.has(option));
      rule.valuesText = chosen.join(", ");
      summary.textContent = chosen.length ? chosen.join(", ") : "Choose...";
    };

    for (const option of options) {
      const field = checkboxField(option);
      field.input.checked = selected.has(option);
      field.input.addEventListener("change", () => {
        if (field.input.checked) selected.add(option);
        else selected.delete(option);
        sync();
      });
      choices.append(field.label);
    }

    sync();
    details.append(summary, choices);
    return details;
  }

  function buildTextValues(rule, field) {
    const values = el("input", `${inputClass} ao3-folder-values`);
    values.type = "text";
    values.placeholder = rule.regex
      ? "Regex, e.g. ^harry potter|marvel (case-insensitive)"
      : field.placeholder || "";
    values.value = rule.valuesText;
    values.addEventListener("input", () => (rule.valuesText = values.value));
    return values;
  }

  function buildRow(rule, index) {
    const row = el("div", "ao3-folder-row");

    // Only the handle starts a drag, so text selection in inputs still works.
    const handle = el("span", "ao3-folder-handle", "☰");
    handle.title = "Drag to reorder";
    handle.addEventListener("mousedown", () => (row.draggable = true));

    row.addEventListener("dragstart", (event) => {
      dragIndex = index;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    });
    row.addEventListener("dragend", () => {
      row.draggable = false;
      dragIndex = null;
      row.classList.remove("drag-over");
    });
    row.addEventListener("dragover", (event) => {
      if (dragIndex === null) return;
      event.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("drag-over");
      if (dragIndex !== null) move(dragIndex, index);
    });

    const name = el("input", `${inputClass} ao3-folder-name`);
    name.type = "text";
    name.placeholder = "Folder name";
    name.value = rule.name;
    name.addEventListener("input", () => (rule.name = name.value));

    const field = FOLDER_FIELDS[rule.type];
    const type = el("select", `${inputClass} ao3-folder-type`);
    for (const [value, config] of Object.entries(FOLDER_FIELDS)) {
      const option = el("option", "", config.label);
      option.value = value;
      type.append(option);
    }
    type.value = rule.type;
    type.addEventListener("change", () => {
      const next = FOLDER_FIELDS[type.value];
      // Typed values and fixed options aren't interchangeable, so start clean.
      if (field.options || next.options) rule.valuesText = "";
      if (next.options) rule.regex = false;
      rule.type = type.value;
      renderRows();
    });

    const values = field.options
      ? buildOptionsDropdown(rule, field.options)
      : buildTextValues(rule, field);

    let regexToggle = null;
    if (!field.options) {
      regexToggle = el("label", "ao3-folder-regex");
      const box = el("input", "ao3-field-checkbox");
      box.type = "checkbox";
      box.checked = rule.regex;
      box.addEventListener("change", () => {
        rule.regex = box.checked;
        renderRows();
      });
      regexToggle.append(box, el("span", "", "Regex"));
    }

    const small = "ao3-folder-button";
    const up = button("↑", () => move(index, index - 1), small);
    up.title = "Higher priority";
    const down = button("↓", () => move(index, index + 1), small);
    down.title = "Lower priority";
    const remove = button(
      "✕",
      () => {
        state.rules.splice(index, 1);
        renderRows();
      },
      small,
    );
    remove.title = "Remove folder";

    const top = el("div", "ao3-folder-line");
    top.append(
      handle,
      el("strong", "", `#${index + 1}`),
      name,
      up,
      down,
      remove,
    );

    const detail = el(
      "div",
      `ao3-folder-detail${regexToggle ? "" : " no-regex"}`,
    );
    detail.append(type, ...(regexToggle ? [regexToggle] : []), values);

    row.append(top, detail);
    return row;
  }

  function renderRows() {
    list.replaceChildren();
    if (!state.rules.length) {
      list.append(el("div", "ao3-folder-empty", "No folders yet."));
      return;
    }
    state.rules.forEach((rule, index) => list.append(buildRow(rule, index)));
  }

  async function save() {
    const rules = [];
    for (const [i, draft] of state.rules.entries()) {
      const label = FOLDER_FIELDS[draft.type].label.toLowerCase();
      const useRegex = draft.regex && !FOLDER_FIELDS[draft.type].options;
      const values = useRegex
        ? [draft.valuesText.trim()].filter(Boolean)
        : splitValues(draft.valuesText);

      if (!values.length) {
        createNotifPopup(`Folder #${i + 1} needs at least one ${label}.`);
        return;
      }
      if (useRegex) {
        if (!draft.name.trim()) {
          createNotifPopup(`Folder #${i + 1}: regex folders need a name.`);
          return;
        }
        if (!isValidPattern(values[0])) {
          createNotifPopup(`Folder #${i + 1}: invalid regular expression.`);
          return;
        }
      }
      rules.push({
        id: draft.id,
        name: draft.name.trim(),
        type: draft.type,
        regex: useRegex,
        values,
      });
    }
    const fresh = await getSettings();
    fresh.folders = { enabled: state.enabled, rules };
    await saveSettings(fresh);
    createNotifPopup("Folders saved");
  }

  const enabled = checkboxField("Group downloads into folders");
  enabled.input.addEventListener("change", () => {
    state.enabled = enabled.input.checked;
  });

  const hint = el(
    "div",
    "ao3-folder-hint",
    "Checked from top to bottom; the first folder that matches is used. " +
      "Folders are created inside your browser's download folder. " +
      "Unmatched downloads stay in the root.",
  );

  const addButton = button(
    "＋ Add folder",
    () => {
      state.rules.push(toDraft({}));
      renderRows();
    },
    "ao3-folder-add",
  );
  const saveButton = button("Save folders", save, "ao3-folder-add");

  element.append(enabled.label, hint, list, addButton, saveButton);
  renderRows();

  // Saved rules load after the first paint.
  getSettings().then((settings) => {
    const saved = settings.folders || {};
    state.enabled = Boolean(saved.enabled);
    state.rules = (saved.rules || []).map(toDraft);
    enabled.input.checked = state.enabled;
    renderRows();
  });

  return { element };
}
