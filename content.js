/* globals browser */

(() => {
  // Inject external stylesheet
  function injectStyles() {
    const styleId = 'ao3-qof-styles';
    if (document.getElementById(styleId)) return;

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = browser.runtime.getURL('styles.css');
    document.head.appendChild(link);
  }

  injectStyles();
  // Listen for messages from background to show popup
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === 'showPopup') {
      await showPopup();
    }
  });

  const modeTextMap = {
    block: { icon: '🚫', label: 'Block Tag/Author' },
    forgot: { icon: '🤔', label: 'I forgor' },
    apply: { icon: '✅', label: 'Apply Default Filters' },
    save: { icon: '💾', label: 'Set Default Filters' },
    hide: { icon: '🫣', label: 'Hide Works' },
    search: { icon: '🔍', label: 'Search Bar' },
    settings: { icon: '⚙️', label: 'Settings' }
  };

  async function showPopup() {
    const popupId = 'ao3-qof-popup';
    if (document.getElementById(popupId)) {
      document.getElementById(popupId).remove();
      return;
    }

    const settings = await window.AO3Popup.getSettings();
    const isMobile = window.innerWidth <= 768;

    function createButton(val, isExpanded = false) {
      const { icon = '', label = '' } = modeTextMap[val] || {};

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = val;

      button.classList.add('ao3-mode-button');
      if (isExpanded) {
        button.classList.add('expanded');
      } else {
        button.classList.add(isMobile ? 'mobile' : 'desktop');
      }

      const iconEl = document.createElement('div');
      iconEl.textContent = icon;
      iconEl.classList.add('ao3-mode-button-icon');
      if (isExpanded) {
        iconEl.classList.add('expanded');
      } else {
        iconEl.classList.add(isMobile ? 'mobile' : 'desktop');
      }

      const textEl = document.createElement('div');
      textEl.textContent = label;
      textEl.classList.add('ao3-mode-button-text');
      if (isExpanded) {
        textEl.classList.add('expanded');
      } else {
        textEl.classList.add(isMobile ? 'mobile' : 'desktop');
      }

      button.appendChild(iconEl);
      button.appendChild(textEl);

      button.addEventListener('click', () => {
        browser.runtime.sendMessage({
          action: 'executeMode',
          mode: val,
        }).then(() => {
          document.getElementById(popupId)?.remove();
        });
      });

      return button;
    }

    let popupOptions = settings.popupOptions || [];
    const allModes = Object.keys(modeTextMap);
    if (!('popupOptions' in settings)) {
      popupOptions = allModes;
    } else {
      popupOptions = [...popupOptions, 'settings'];
    }

    // Create expanded fullscreen modal (desktop only)
    function createExpandedModal() {
      const modalId = 'ao3-qof-modal';
      document.getElementById(modalId)?.remove();

      const modal = document.createElement('div');
      modal.id = modalId;
      modal.classList.add('ao3-modal-overlay');

      const container = document.createElement('div');
      container.classList.add('ao3-modal-container');

      const header = document.createElement('div');
      header.classList.add('ao3-modal-header');

      const title = document.createElement('h2');
      title.textContent = 'Select Mode';
      title.classList.add('ao3-modal-title');
      header.appendChild(title);

      const contractBtn = document.createElement('button');
      contractBtn.textContent = '⇦ Contract';
      contractBtn.classList.add('ao3-control-button');
      contractBtn.addEventListener('click', () => {
        modal.remove();
        showPopup();
      });
      header.appendChild(contractBtn);

      container.appendChild(header);

      const expandedGrid = document.createElement('div');
      expandedGrid.classList.add('ao3-expanded-grid');

      popupOptions.forEach(val => {
        if (val === '') return;
        const expandedButton = createButton(val, true);
        expandedGrid.appendChild(expandedButton);
      });

      container.appendChild(expandedGrid);

      const footer = document.createElement('div');
      footer.classList.add('ao3-modal-footer');

      container.appendChild(footer);
      modal.appendChild(container);
      document.body.appendChild(modal);
    }

    const content = document.createElement('div');
    content.classList.add('ao3-popup-content', isMobile ? 'mobile' : 'desktop');

    const label = document.createElement('label');
    label.textContent = 'Select mode:';
    label.classList.add('ao3-popup-label', isMobile ? 'mobile' : 'desktop');
    content.appendChild(label);

    const grid = document.createElement('div');
    grid.classList.add('ao3-button-grid', isMobile ? 'mobile' : 'desktop');

    popupOptions.forEach(val => {
      if (val === '') return;
      grid.appendChild(createButton(val, false));
    });

    content.appendChild(grid);

    // Add expand button on desktop
    if (!isMobile) {
      const expandBtn = document.createElement('button');
      expandBtn.textContent = '⛶ Expand';
      expandBtn.classList.add('ao3-control-button', 'ao3-expand-button');
      expandBtn.addEventListener('click', () => {
        createExpandedModal();
        document.getElementById(popupId)?.remove();
      });
      content.appendChild(expandBtn);
    }

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      extraClasses: ['modes'],
    });

    document.body.appendChild(popup);

  }
})();