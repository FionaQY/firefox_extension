(() => {
  browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === 'initialize') {
      goToWork(msg.data.filterType, msg.data.targetValue)
    }
  });

  async function goToWork(filterType, targetValue) {
    let relevantData = JSON.parse(targetValue || 'null');

    if (!filterType || relevantData == null) return;

    if (filterType === 'revised_at') {
      relevantData = new Date(relevantData);
    }

    console.log(`Scrolling now...`);
    const works = document.querySelectorAll('.work.blurb.group');
    for (let i = works.length - 1; i  > 0; i--) {
      const work = works[i];

      const AO3Extractor = window.AO3Extractor;
      const extractedData = AO3Extractor.extractRelevantData(work.textContent, filterType);
      if (AO3Extractor.isValid(relevantData, extractedData)) {
        work.scrollIntoView({behavior: 'smooth', block: 'center'});
        break;
      }
    }
  }

setTimeout(() => {
  console.log("Sending ready message");
  browser.runtime.sendMessage({action: 'scrollContentScriptReady'});
}, 100);
})();
