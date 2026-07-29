/* eslint-disable no-unused-vars */
/* globals AO3Popup */
/* eslint-enable no-unused-vars */
(() => {
  const popupId = 'ao3-qof-popup';
  const tempPopup = document.getElementById(popupId);
  if (tempPopup) {
    tempPopup.remove();
  }

  async function openSearchBar() {
    const isMobile = window.innerWidth <= 768;
    let isMatchCase = false;
    let isMatchWholeWord = false;
    let isUseRegex = false;

    const neutralColor = '#6c757d';
    const activeColor = '#4a90e2';

    const searchBar = window.AO3Popup.createSearchBar({
      inputPlaceholder: 'Search',
      inputValue: '',
      buttons: [
        {text: 'Aa', onClick: (e) => {isMatchCase = !isMatchCase; e.target.style.background = isMatchCase ? activeColor : neutralColor;}},
        {text: '[ab]', onClick: (e) => {isMatchWholeWord = !isMatchWholeWord; e.target.style.background = isMatchWholeWord ? activeColor : neutralColor;}},
        {text: '.*', onClick: (e) => {isUseRegex = !isUseRegex; e.target.style.background = isUseRegex ? activeColor : neutralColor;}},
      ],
      onInputChange: (value) => console.log('Input changed:', value),
    });

    const content = document.createElement('div');
    content.appendChild(searchBar);
    const buttons = [
      {
        text: 'Clear',
        color: '#ee5555',
        onClick: () => {
          const input = searchBar.querySelector('input');
          if (input) {
            input.value = '';
          }
        }
      },
      {
        text: '🔍︎',
        color: '#4a90e2',
        onClick: () => {
          console.log(`isMatchCase :${isMatchCase}`)
          console.log(`isMatchWholeWord :${isMatchWholeWord}`)
          console.log(`isUseRegex :${isUseRegex}`)
          // TODO: Implement search functionality with properly scoped variables
          /*
          try {
            browser.runtime.sendMessage({
              action: 'scrollPage',
              targetUrl: target,
              data: {
                filterType: filterType,
                targetValue: JSON.stringify(relevantData)
              }
            });
            window.location.href = target;
            return;
          } catch (error) {
            console.error('AO3 Search Bar error:', error);
          }
          */
        }
      }
    ];

    const popup = window.AO3Popup.createPopupContainer(popupId, isMobile, {
      content: content,
      buttons: buttons,
      extraStyles: isMobile ? '' : 'padding-bottom: 0;'
    });

    document.body.appendChild(popup);
  }

  openSearchBar();
})();
