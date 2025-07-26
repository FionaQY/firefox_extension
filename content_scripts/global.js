window.AO3Blocker = window.AO3Blocker || {
  extractString(workText, filterType) {
    const filterRegexMap = {
      'word_count': /Words:\s*([\d,]+)/,
      'comments_count': /Comments:\s*([\d,]+)/,
      'kudos_count': /Kudos:\s*([\d,]+)/,
      'bookmarks_count': /Bookmarks:\s*([\d,]+)/,
      'hits': /Hits:\s*([\d,]+)/,
      'revised_at': /\b(\d{1,2} \w+ \d{4})\b/,
      'authors_to_sort_on': /by\s+([^\n]+)/,
      'title_to_sort_on': /^(.+?)\s+by\s+/
    };
    const regex = filterRegexMap[filterType];
    if (!regex) {
      console.warn(`No regex found for filterType: ${filterType}`);
      return '';
    }
    const match = workText.match(regex);
    if (!match) {
      console.warn(`No match found for ${filterType} in text given`);
      return '';
    }
    return match[1].trim();
  },

  extractDate(workText, filterType) {
    const raw = this.extractString(workText, filterType);
    const parseDate = new Date(raw);
    return isNaN(parseDate) ? raw : parseDate;
  },

  extractNumber(workText, filterType) {
    const raw = this.extractString(workText, filterType);
    if (raw.length === 0) return 0;
    const numVal = raw.replace(/,/g, '');
    return parseInt(numVal, 10);
  },

  extractRelevantData(workText, filterType) {
    if (filterType === 'revised_at') {
      return this.extractDate(workText, filterType);
    } else if (filterType === 'authors_to_sort_on' || filterType === 'title_to_sort_on') {
      return this.extractString(workText, filterType);
    } else {
      return this.extractNumber(workText, filterType);
    }
  },

  isValid(relevantData, extractedData) {
    return extractedData > relevantData;
  }
};
(() => {
  if (window.hasRun) return;
  window.hasRun = true;
  console.log('Global script loaded');
})