(() => {
  if (window.hasRun) return;
  window.hasRun = true;

  console.log('AO3 Scrolling injected successfully!');

  const currentUrl = window.location.href;
  if (!currentUrl.includes('archiveofourown.org/works?')) {
    console.warn('Current page is not an AO3 page');
    return;
  }

  const justBlocked = localStorage.getItem('just_blocked');
  if (!justBlocked) {
    console.log('Tag is not yet blocked');
    removeLocalStorage();
    return
  };

  function removeLocalStorage() {
    localStorage.removeItem('ao3_target_filter_type');
    localStorage.removeItem('ao3_target_value');
    localStorage.removeItem('just_blocked');
  }

  async function goToWork() {
    console.log('Scrolling to work now...')
    const filterType = localStorage.getItem('ao3_target_filter_type');
    let relevantData = JSON.parse(localStorage.getItem('ao3_target_value') || 'null');
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
    removeLocalStorage();
  }

  goToWork();
})();
