/* globals */

import {
  getSettings,
  openModePopup,
  removeModePopup,
  saveSettings,
} from "./helper/popup";
import { MOBILE_MAX_WIDTH, optionsPopupHelper } from "./helper/popup_fields";
import {
  DEFAULT_DOCX_SETTINGS,
  DOCX_SETTING_KEYS,
} from "./helper/document_format";

(() => {
  removeModePopup();

  const fontField = (key, label) => [key, { label, type: "text" }];
  const sizeField = (key, label, step = "0.5") => [
    key,
    { label, type: "number", min: "5", max: "72", step, required: true },
  ];
  const marginField = (key, label) => [
    key,
    {
      label,
      type: "number",
      min: "0.1",
      max: "3",
      step: "0.05",
      required: true,
    },
  ];

  const fields = Object.fromEntries([
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

  async function openFormatPopup() {
    const settings = await getSettings();
    const generalSettings = {
      ...DEFAULT_DOCX_SETTINGS,
      ...(settings.general || {}),
    };
    const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
    const [inputsMap, content] = optionsPopupHelper(
      fields,
      isMobile,
      generalSettings,
    );
    const hint = document.createElement("p");
    hint.textContent =
      "Font sizes are in points; margins and gutter are in inches. Font names must be installed where the DOCX is opened.";
    content.prepend(hint);

    openModePopup(isMobile, {
      content,
      extraClasses: ["format-settings"],
      buttons: [
        {
          text: "Save",
          variant: "primary",
          onClick: async () => {
            for (const [key, { input, type }] of Object.entries(inputsMap)) {
              if (!input.reportValidity()) return;
              const value =
                type === "checkbox"
                  ? input.checked
                  : type === "number"
                    ? Number(input.value)
                    : input.value.trim();
              generalSettings[key] = value;
            }

            settings.general = generalSettings;
            await saveSettings(settings);
            removeModePopup();
          },
        },
        {
          text: "Reset",
          variant: "danger",
          onClick: async () => {
            if (!confirm("Reset document format settings to their defaults?")) {
              return;
            }
            const formatKeys = new Set(Object.keys(DEFAULT_DOCX_SETTINGS));
            settings.general = Object.fromEntries(
              Object.entries(settings.general || {}).filter(
                ([key]) => !formatKeys.has(key),
              ),
            );
            await saveSettings(settings);
            populateDefaults(inputsMap);
          },
        },
      ],
    });
  }

  openFormatPopup();
})();
