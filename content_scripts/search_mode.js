/* eslint-disable no-unused-vars */
/* globals AO3Popup */
/* eslint-enable no-unused-vars */
(() => {
  const popupId = 'ao3-qof-popup';
  document.getElementById(popupId)?.remove();

  const HIGHLIGHT_CLASS = 'ao3-search-highlight';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);
  const OWN_UI_SELECTOR = `#${popupId}, .ao3-notif-popup, .ao3-modal-overlay`;
  const DEBOUNCE = 250;

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
      if (match[0].length === 0) { // zero-width match, e.g. the regex `a*`
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
    clearHighlights(); // in case a previous search bar was closed without clearing

    const status = document.createElement('div');
    status.classList.add('ao3-search-status');

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

    function goToMatch(index) {
      if (matches.length === 0) return;
      if (currentIndex >= 0) {
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

    let debounceTimer = null;
    function searchLater(query) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => search(query), DEBOUNCE);
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
      onInputChange: (value) => searchLater(value.trim()),
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
      extraClasses: isMobile ? [] : ['flush-bottom'],
      onClose: () => {
        clearHighlights();
        popup.remove();
      }
    });

    document.body.appendChild(popup);
    getInput().focus();
  }

  openSearchBar();
})();
