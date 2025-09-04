(() => {
  browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === 'initialize') {
      if (typeof window.A03WorkShrinker === 'function') {
        return;
      }
      await handleShrinkWorks();
      window.A03WorkShrinker = handleShrinkWorks;
    }
  });

  const currentUrl = window.location.href;
  const workUrl = window.AO3UrlParser.getWorkUrl(currentUrl);
  if (workUrl != '') { // if a work page
    window.AO3Popup.createNotifPopup('No works to shrink here');
    return;
  }

  function isUndesired(work, settings) {
    const stats = window.AO3Extractor.extractAllValues(work);
    
    const words = stats['word_count'];
    const hideWordUnder = settings['hideWordUnder'];
    const hideWordOver = settings['hideWordOver'];
    const reasons = [];
    if (hideWordUnder.length != 0 && words < hideWordUnder) {
      reasons.push(`words < ${hideWordUnder}`);
    }
    if (hideWordOver.length != 0 && words > hideWordOver) {
      reasons.push(`words > ${hideWordOver}`);
    }

    const hideLanguages = settings['hideLanguage']?.split(',').filter(x => x.trim().length > 0);
    for (const lang of hideLanguages) {
      if (stats['language'] == AO3Extractor.getLangAbb(lang)) {
        reasons.push(`Language: ${lang}`);
      }
    }
    
    const showLanguages = settings['showLanguage']?.split(',').filter(x => x.trim().length > 0);
    if (showLanguages.length > 0) {
      const hasLang = showLanguages.some(x => AO3Extractor.getLangAbb(x) == stats['language']);
      if (!hasLang) {
        reasons.push(`Language: not ${showLanguages.join(', ')}`);
      }
      console.log(hasLang);
    }
    

    const tags = Array.from(work.querySelectorAll('ul.tags.commas li a')).map(x => x.innerText);
    const excludeTags = settings['hideTags']?.split(',').map(x => x.trim()).filter(x => x.length > 0);
    for (const ex of excludeTags) {
      const pattern = new RegExp(
        '^' + ex.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
        'i'
      );
      for (const tag of tags) {
        if (pattern.test(tag.trim())) {
          reasons.push(`Tag: ${tag}`);
        }
      }
    }
    const excludeAuthors = settings['hideAuthor']?.split(',').map(x => x.trim()).filter(x => x.length > 0);
    for (const author of excludeAuthors) {
      if (stats['authors_to_sort_on'].includes(author)) {
        reasons.push(`Author: ${author}`);
      }
    }
    
    return reasons.map(x => x.trim()).join(", ");
  }

  function shrink(work, reason) {
    const header = document.createElement('div');
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.style.justifyContent = "space-between";

    const toggle = document.createElement('button');
    toggle.textContent = "Show/Hide Work";
    toggle.style.cursor = "pointer";

    const label = document.createElement('span');
    label.textContent = reason

    header.appendChild(label);
    header.appendChild(toggle);
    
    const content = document.createElement('div');
    while (work.firstChild) {
      content.appendChild(work.firstChild);
    }
    content.style.display = "none";

    work.appendChild(header);
    work.appendChild(content);

    toggle.addEventListener('click', () => {
      content.style.display = content.style.display === "none" ? "block" : "none";
    });
  }

  
  async function handleShrinkWorks() {
    const { settings = {} } = await browser.storage.local.get('settings');
    if (!settings['shrinkWorks']) {
      return;
    }
    const works = document.querySelectorAll('.work.blurb.group');
    for (const work of works) {
      const reason = isUndesired(work, settings);
      if (reason.length != 0) {
        shrink(work, reason);
      }
    }
  }

setTimeout(() => {
  browser.runtime.sendMessage({action: 'shrinkContentScriptReady'});
}, 100);
})();