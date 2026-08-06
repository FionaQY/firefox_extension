/* eslint-disable no-unused-vars */
/* globals AO3Popup */
/* eslint-enable no-unused-vars */
(() => {
  const popupId = 'ao3-qof-popup';
  document.getElementById(popupId)?.remove();

  const HIGHLIGHT_CLASS = 'ao3-search-highlight';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);
  const OWN_UI_SELECTOR = `#${popupId}, .ao3-notif-popup, .ao3-modal-overlay`;

  let isMatchCase = false;
  let isMatchWholeWord = false;
  let isUseRegex = false;
  let matches = [];
  let currentIndex = -1;

  function buildRegex(query) {
    const pattern = isUseRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const whole = isMatchWholeWord ? `\\b(?:${pattern})\\b` : pattern;
    return new RegExp(whole, isMatchCase ? 'g' : 'gi');
  }

  function clearHighlights() {
    for (const mark of document.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`)) {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
    matches = [];
    currentIndex = -1;
  }

  function getTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest(OWN_UI_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim().length === 0 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  function highlightNode(node, regex) {
    const text = node.nodeValue;
    const fragment = document.createDocumentFragment();
    const created = [];
    let lastEnd = 0;
    let match;

    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      fragment.appendChild(document.createTextNode(text.slice(lastEnd, match.index)));
      const mark = document.createElement('mark');
      mark.className = HIGHLIGHT_CLASS;
      mark.textContent = match[0];
      fragment.appendChild(mark);
      created.push(mark);
      lastEnd = match.index + match[0].length;
    }

    if (created.length === 0) {
      return created;
    }
    fragment.appendChild(document.createTextNode(text.slice(lastEnd)));
    node.parentNode.replaceChild(fragment, node);
    return created;
  }

  function openSearchBar() {
    const isMobile = window.innerWidth <= 768;
    // clearHighlights();

    const status = document.createElement('div');
    status.classList.add('ao3-search-status');
    status.style.cssText = 'cursor: pointer; font-size: 12px; margin-top: 2px; text-align: center; font-weight: bold;';
    status.title = 'Tap to scroll through match indices';

    function setStatus(msg) {
      status.textContent = msg;
    }

    function updateStatus() {
      if (matches.length === 0) {
        setStatus('');
        return;
      }
      setStatus(`${currentIndex + 1} of ${matches.length} match${matches.length === 1 ? '' : 'es'}`);
    }

    function openScrollPicker() {
      if (matches.length === 0) return;

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px);
        display: flex; align-items: center; justify-content: center;
      `;

      const pickerBox = document.createElement('div');
      pickerBox.style.cssText = `
        background: var(--ao3-popup-bg, #fff); color: #000;
        border-radius: 12px; padding: 14px; width: 200px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3); text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 8px;
      `;

      const title = document.createElement('div');
      title.style.cssText = 'font-weight: bold; font-size: 13px; opacity: 0.8;';
      title.textContent = 'Scroll to Match Index';

      const scrollWheel = document.createElement('div');
      scrollWheel.style.cssText = `
        height: 120px; width: 100%; overflow-y: scroll;
        scroll-snap-type: y mandatory; -webkit-overflow-scrolling: touch;
        border-top: 1px solid #ccc; border-bottom: 1px solid #ccc;
        padding: 45px 0; box-sizing: border-box;
      `;

      matches.forEach((_, idx) => {
        const item = document.createElement('div');
        item.textContent = `${idx + 1} / ${matches.length}`;
        item.style.cssText = `
          height: 30px; line-height: 30px; font-size: 15px;
          font-weight: ${idx === currentIndex ? 'bold' : 'normal'};
          scroll-snap-align: center; cursor: pointer;
        `;
        item.addEventListener('click', () => {
          goToMatch(idx);
          overlay.remove();
        });
        scrollWheel.appendChild(item);
      });

      let scrollTimer = null;
      scrollWheel.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const itemHeight = 30;
          const targetIdx = Math.round(scrollWheel.scrollTop / itemHeight);
          if (targetIdx >= 0 && targetIdx < matches.length && targetIdx !== currentIndex) {
            goToMatch(targetIdx);
          }
        }, 80);
      });

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Done';
      closeBtn.style.cssText = `
        padding: 4px 14px; border: none; background: #900; color: #fff;
        border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 4px; font-size: 13px;
      `;
      closeBtn.onclick = () => overlay.remove();

      pickerBox.appendChild(title);
      pickerBox.appendChild(scrollWheel);
      pickerBox.appendChild(closeBtn);
      overlay.appendChild(pickerBox);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      document.body.appendChild(overlay);

      setTimeout(() => {
        scrollWheel.scrollTop = currentIndex * 30;
      }, 10);
    }

    status.addEventListener('click', openScrollPicker);

    function goToMatch(index) {
      if (matches.length === 0) return;
      if (currentIndex >= 0 && matches[currentIndex]) {
        matches[currentIndex].classList.remove('current');
      }
      currentIndex = (index + matches.length) % matches.length;
      const mark = matches[currentIndex];
      mark.classList.add('current');
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateStatus();
    }

    function search(query) {
      clearHighlights();
      if (!query) {
        setStatus('');
        return;
      }

      let regex;
      try {
        regex = buildRegex(query);
      } catch {
        setStatus('Invalid regular expression');
        return;
      }

      const root = document.querySelector('#main') || document.body;
      for (const node of getTextNodes(root)) {
        matches.push(...highlightNode(node, regex));
      }

      if (matches.length === 0) {
        setStatus('No matches');
        return;
      }
      goToMatch(0);
    }

    function toggleOption(e, isActive) {
      e.target.classList.toggle('active', isActive);
      search(getInput().value.trim());
    }

    const searchBar = window.AO3Popup.createSearchBar({
      inputPlaceholder: 'Search',
      inputValue: '',
      isMobile: isMobile,
      buttons: [
        {text: 'Aa', variant: 'neutral', onClick: (e) => {isMatchCase = !isMatchCase; toggleOption(e, isMatchCase);}},
        {text: '[ab]', variant: 'neutral', onClick: (e) => {isMatchWholeWord = !isMatchWholeWord; toggleOption(e, isMatchWholeWord);}},
        {text: '.*', variant: 'neutral', onClick: (e) => {isUseRegex = !isUseRegex; toggleOption(e, isUseRegex);}},
      ],
    });

    const getInput = () => searchBar.querySelector('input');

    getInput().addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (matches.length === 0) {
        search(getInput().value.trim());
      } else {
        goToMatch(e.shiftKey ? currentIndex - 1 : currentIndex + 1);
      }
    });

    const content = document.createElement('div');
    content.appendChild(searchBar);
    content.appendChild(status);

    const buttons = [
      {
        text: 'Clear',
        variant: 'danger',
        onClick: () => {
          getInput().value = '';
          clearHighlights();
          setStatus('');
        }
      },
      {
        text: '↑',
        variant: 'neutral',
        onClick: () => goToMatch(currentIndex - 1)
      },
      {
        text: '↓',
        variant: 'neutral',
        onClick: () => goToMatch(currentIndex + 1)
      },
      {
        text: '🔍︎',
        variant: 'primary',
        onClick: () => search(getInput().value.trim())
      }
    ];

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      buttons: buttons,
      extraClasses: ['flush-bottom'],
      onClose: () => {
        clearHighlights();
        popup.remove();
      }
    });

    if (isMobile) {
      popup.style.cssText = `
        position: fixed !important;
        bottom: 0 !important;
        top: auto !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: auto !important;
        max-height: max-content !important;
        min-height: min-content !important;
        padding: 6px 10px calc(6px + env(safe-area-inset-bottom, 0px)) 10px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        border-radius: 12px 12px 0 0 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-end !important;
        overflow: hidden !important;
      `;

      content.style.cssText = `
        height: auto !important;
        flex: 0 0 auto !important;
      `;

      searchBar.style.cssText = `
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 4px !important;
        align-items: center !important;
        height: auto !important;
      `;
    }

    document.body.appendChild(popup);
    getInput().focus();
  }

  openSearchBar();
})();
