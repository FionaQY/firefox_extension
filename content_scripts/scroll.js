(() => {
  if (window.hasRun) return;
  window.hasRun = true;

  console.log('AO3 Scrolling injected successfully!');

  const currentUrl = window.location.href;
  if (!currentUrl.includes('archiveofourown.org/works?')) {
    console.warn('Current page is not an AO3 page');
    return;
  }

  browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === 'initialize') {
      goToWork(msg.data.filterType, msg.data.targetValue)
    }
  });

  async function goToWork(filterType, targetValue) {
    console.log('Scrolling to work now...');
    let relevantData = JSON.parse(targetValue || 'null');

    if (!filterType || relevantData == null) return;

    if (filterType === 'revised_at') {
      relevantData = new Date(relevantData);
    }

    const works = document.querySelectorAll('.work.blurb.group');
    for (let i = works.length - 1; i  > 0; i--) {
      const work = works[i];
      
      const extractedData = window.AO3Blocker.extractRelevantData(work.textContent, filterType);
      if (window.AO3Blocker.isValid(relevantData, extractedData)) {
        console.log("Scrolling to work", extractedData);
        work.scrollIntoView({behavior: 'smooth', block: 'center'});
        break;
      }
    }
  }

})();
