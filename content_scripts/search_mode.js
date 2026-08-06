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
  let lastQuery = '';

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

    const status = document.createElement('div');
    status.classList.add('ao3-search-status');
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
      overlay.className = 'ao3-search-picker-overlay';

      const pickerBox = document.createElement('div');
      pickerBox.className = 'ao3-search-picker-box';

      const title = document.createElement('div');
      title.className = 'ao3-search-picker-title';
      title.textContent = 'Scroll to Match Index';

      const scrollWheel = document.createElement('div');
      scrollWheel.className = 'ao3-search-picker-wheel';

      matches.forEach((_, idx) => {
        const item = document.createElement('div');
        item.textContent = `${idx + 1} / ${matches.length}`;
        item.className = 'ao3-search-picker-item';
        item.style.fontWeight = idx === currentIndex ? 'bold' : 'normal';
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
      closeBtn.className = 'ao3-search-picker-close';
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

    function search() {
      const query = getInput().value.trim();
      const queryTracking = `${isMatchCase}${isMatchWholeWord}${isUseRegex}${query}`;

      if (queryTracking === lastQuery) {
        goToMatch(currentIndex + 1);
        return;
      }

      lastQuery = queryTracking;
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
        clearHighlights();
        return;
      }
      goToMatch(0);
    }

    function toggleOption(e, isActive) {
      e.target.classList.toggle('active', isActive);
      search();
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
      search();
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
        onClick: () => search()
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
      popup.classList.add('search-popup', 'mobile');
      content.classList.add('ao3-search-popup-content');
      searchBar.classList.add('mobile');
    }

    document.body.appendChild(popup);
    getInput().focus();
  }

  openSearchBar();
})();
