export const DOCX_SETTING_KEYS = {
  BODY_FONT: "docxBodyFont",
  HEADINGS_FONT: "docxHeadingFont",
  NOTES_FONT: "docxNotesFont",
  BODY_SIZE: "docxBodySize",
  NOTES_SIZE: "docxNotesSize",
  INFO_SIZE: "docxInfoSize",
  COVER_TITLE_SIZE: "docxCoverTitleSize",
  TITLE_SIZE: "docxTitleSize",
  AUTHOR_SIZE: "docxAuthorSize",
  CHAPTER_TITLE_SIZE: "docxChapterTitleSize",
  APPENDIX_TITLE_SIZE: "docxAppendixTitleSize",
  MARGIN_LEFT: "docxMarginLeft",
  MARGIN_RIGHT: "docxMarginRight",
  MARGIN_TOP: "docxMarginTop",
  MARGIN_BOTTOM: "docxMarginBottom",
  GUTTER: "docxGutter",
  INCLUDE_TAGS: "docxIncludeTags",
  INCLUDE_RELATIONSHIPS: "docxIncludeRelationships",
};

export const DEFAULT_DOCX_SETTINGS = {
  [DOCX_SETTING_KEYS.BODY_FONT]: "Sabon Next LT",
  [DOCX_SETTING_KEYS.HEADINGS_FONT]: "Sabon Next LT",
  [DOCX_SETTING_KEYS.NOTES_FONT]: "Sabon Next LT",
  [DOCX_SETTING_KEYS.BODY_SIZE]: 10.5,
  [DOCX_SETTING_KEYS.NOTES_SIZE]: 10.5,
  [DOCX_SETTING_KEYS.INFO_SIZE]: 9,
  [DOCX_SETTING_KEYS.COVER_TITLE_SIZE]: 30,
  [DOCX_SETTING_KEYS.TITLE_SIZE]: 32,
  [DOCX_SETTING_KEYS.AUTHOR_SIZE]: 13,
  [DOCX_SETTING_KEYS.CHAPTER_TITLE_SIZE]: 19,
  [DOCX_SETTING_KEYS.APPENDIX_TITLE_SIZE]: 12,
  [DOCX_SETTING_KEYS.MARGIN_LEFT]: 0.75,
  [DOCX_SETTING_KEYS.MARGIN_RIGHT]: 0.65,
  [DOCX_SETTING_KEYS.MARGIN_TOP]: 0.7,
  [DOCX_SETTING_KEYS.MARGIN_BOTTOM]: 0.75,
  [DOCX_SETTING_KEYS.GUTTER]: 0.1,
  [DOCX_SETTING_KEYS.INCLUDE_TAGS]: true,
  [DOCX_SETTING_KEYS.INCLUDE_RELATIONSHIPS]: true,
};

function getNumber(settings, key, min, max) {
  const value = Number(settings[key] ?? DEFAULT_DOCX_SETTINGS[key]);
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : DEFAULT_DOCX_SETTINGS[key];
}

function getFont(settings, key) {
  const value = settings[key];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_DOCX_SETTINGS[key];
}

function getBoolean(settings, key) {
  const value = settings[key];
  return value === undefined
    ? DEFAULT_DOCX_SETTINGS[key]
    : value === true || value === "true";
}

export function getDocxFormat(settings = {}) {
  const points = (key) => getNumber(settings, key, 5, 72);
  const inches = (key) => getNumber(settings, key, 0.1, 3) * 1440;

  return {
    fonts: {
      body: getFont(settings, DOCX_SETTING_KEYS.BODY_FONT),
      headings: getFont(settings, DOCX_SETTING_KEYS.HEADINGS_FONT),
      notes: getFont(settings, DOCX_SETTING_KEYS.NOTES_FONT),
    },
    sizes: {
      body: points(DOCX_SETTING_KEYS.BODY_SIZE),
      notes: points(DOCX_SETTING_KEYS.NOTES_SIZE),
      info: points(DOCX_SETTING_KEYS.INFO_SIZE),
      coverTitle: points(DOCX_SETTING_KEYS.COVER_TITLE_SIZE),
      title: points(DOCX_SETTING_KEYS.TITLE_SIZE),
      author: points(DOCX_SETTING_KEYS.AUTHOR_SIZE),
      chapterTitle: points(DOCX_SETTING_KEYS.CHAPTER_TITLE_SIZE),
      appendixTitle: points(DOCX_SETTING_KEYS.APPENDIX_TITLE_SIZE),
    },
    page: {
      margin: {
        left: inches(DOCX_SETTING_KEYS.MARGIN_LEFT),
        right: inches(DOCX_SETTING_KEYS.MARGIN_RIGHT),
        top: inches(DOCX_SETTING_KEYS.MARGIN_TOP),
        bottom: inches(DOCX_SETTING_KEYS.MARGIN_BOTTOM),
        gutter: inches(DOCX_SETTING_KEYS.GUTTER),
      },
    },
    includeTags: getBoolean(settings, DOCX_SETTING_KEYS.INCLUDE_TAGS),
    includeRelationships: getBoolean(
      settings,
      DOCX_SETTING_KEYS.INCLUDE_RELATIONSHIPS,
    ),
  };
}
