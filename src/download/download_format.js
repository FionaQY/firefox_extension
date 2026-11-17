import { createNotifPopup } from "../ui/popup";
import { getSettings, saveSettings } from "../storage/settings";
import { optionsPopupHelper } from "../ui/popup_fields";
import { DEFAULT_DOCX_SETTINGS, DOCX_SETTING_KEYS } from "./document_format";
import { el, button } from "./download_dom";

const fontField = (key, label) => [key, { label, type: "text" }];
const sizeField = (key, label, step = "0.5") => [
  key,
  { label, type: "number", min: "5", max: "72", step, required: true },
];
const marginField = (key, label) => [
  key,
  { label, type: "number", min: "0.1", max: "3", step: "0.05", required: true },
];

const FIELDS = Object.fromEntries([
  fontField(DOCX_SETTING_KEYS.BODY_FONT, "Body font"),
  fontField(DOCX_SETTING_KEYS.HEADINGS_FONT, "Heading font"),
  fontField(DOCX_SETTING_KEYS.NOTES_FONT, "Notes font"),
  sizeField(DOCX_SETTING_KEYS.BODY_SIZE, "Body font size (pt)"),
  sizeField(DOCX_SETTING_KEYS.NOTES_SIZE, "Notes font size (pt)"),
  sizeField(DOCX_SETTING_KEYS.INFO_SIZE, "Info page font size (pt)"),
  sizeField(DOCX_SETTING_KEYS.COVER_TITLE_SIZE, "Cover title font size (pt)"),
  sizeField(DOCX_SETTING_KEYS.TITLE_SIZE, "Title page font size (pt)"),
  sizeField(DOCX_SETTING_KEYS.AUTHOR_SIZE, "Author font size (pt)"),
  sizeField(
    DOCX_SETTING_KEYS.CHAPTER_TITLE_SIZE,
    "Chapter heading font size (pt)",
  ),
  sizeField(
    DOCX_SETTING_KEYS.APPENDIX_TITLE_SIZE,
    "Appendix heading font size (pt)",
  ),
  marginField(DOCX_SETTING_KEYS.MARGIN_LEFT, "Left margin (in)"),
  marginField(DOCX_SETTING_KEYS.MARGIN_RIGHT, "Right margin (in)"),
  marginField(DOCX_SETTING_KEYS.MARGIN_TOP, "Top margin (in)"),
  marginField(DOCX_SETTING_KEYS.MARGIN_BOTTOM, "Bottom margin (in)"),
  marginField(DOCX_SETTING_KEYS.GUTTER, "Gutter (in)"),
  [
    DOCX_SETTING_KEYS.INCLUDE_TAGS,
    { label: "Include tags in the appendix", type: "checkbox" },
  ],
  [
    DOCX_SETTING_KEYS.INCLUDE_RELATIONSHIPS,
    { label: "Include relationships in the appendix", type: "checkbox" },
  ],
]);

function populateDefaults(inputsMap) {
  for (const [key, { input }] of Object.entries(inputsMap)) {
    const value = DEFAULT_DOCX_SETTINGS[key];
    if (input.type === "checkbox") input.checked = value;
    else input.value = String(value);
  }
}

export function buildFormatView({ isMobile }) {
  const element = el("div", "ao3-format-content");
  element.append(el("div", "ao3-format-hint", "Loading..."));

  getSettings()
    .then((settings) => {
      const current = { ...DEFAULT_DOCX_SETTINGS, ...(settings.general || {}) };
      const [inputsMap, content] = optionsPopupHelper(
        FIELDS,
        isMobile,
        current,
      );

      async function save() {
        const values = {};
        for (const [key, { input, type }] of Object.entries(inputsMap)) {
          if (!input.reportValidity()) return;
          values[key] =
            type === "checkbox"
              ? input.checked
              : type === "number"
                ? Number(input.value)
                : input.value.trim();
        }
        // Re-read so changes saved elsewhere meanwhile aren't overwritten.
        const fresh = await getSettings();
        fresh.general = { ...(fresh.general || {}), ...values };
        await saveSettings(fresh);
        createNotifPopup("Format saved");
      }

      async function reset() {
        if (!confirm("Reset document format settings to their defaults?")) {
          return;
        }
        const formatKeys = new Set(Object.keys(DEFAULT_DOCX_SETTINGS));
        const fresh = await getSettings();
        fresh.general = Object.fromEntries(
          Object.entries(fresh.general || {}).filter(
            ([key]) => !formatKeys.has(key),
          ),
        );
        await saveSettings(fresh);
        populateDefaults(inputsMap);
      }

      const hint = el(
        "div",
        "ao3-format-hint",
        "Font sizes are in points; margins and gutter are in inches. " +
          "Font names must be installed where the DOCX is opened.",
      );
      const actions = el("div", "ao3-format-actions");
      actions.append(
        button("Save", save, "ao3-primary"),
        button("Reset", reset, "ao3-danger"),
      );

      element.replaceChildren(hint, content, actions);
    })
    .catch((error) => {
      element.replaceChildren(
        el(
          "div",
          "ao3-format-hint",
          `Could not load settings: ${error.message}`,
        ),
      );
    });

  return { element };
}
