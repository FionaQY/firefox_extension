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

    const searchBar = window.AO3Popup.createSearchBar({
      inputPlaceholder: 'Search',
      inputValue: '',
      buttons: [
        {text: 'Aa', variant: 'neutral', onClick: (e) => {isMatchCase = !isMatchCase; e.target.classList.toggle('active', isMatchCase);}},
        {text: '[ab]', variant: 'neutral', onClick: (e) => {isMatchWholeWord = !isMatchWholeWord; e.target.classList.toggle('active', isMatchWholeWord);}},
        {text: '.*', variant: 'neutral', onClick: (e) => {isUseRegex = !isUseRegex; e.target.classList.toggle('active', isUseRegex);}},
      ],
      onInputChange: (value) => console.log('Input changed:', value),
    });

    const content = document.createElement('div');
    content.appendChild(searchBar);
    const buttons = [
      {
        text: 'Clear',
        variant: 'danger',
        onClick: () => {
          const input = searchBar.querySelector('input');
          if (input) {
            input.value = '';
          }
        }
      },
      {
        text: '🔍︎',
        variant: 'primary',
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
      extraClasses: isMobile ? [] : ['flush-bottom']
    });

    document.body.appendChild(popup);
  }

  openSearchBar();
})();
