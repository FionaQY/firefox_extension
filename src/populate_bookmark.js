/* globals browser */
import { getWorkUrl, getSeriesUrl } from "./helper/commons";
import { createNotifPopup } from "./helper/popup";
import { getBookmarkNotes } from "./helper/bookmark";

(() => {
  if (typeof window.AO3BookmarkHandler === "function") {
    return;
  }

  const currentUrl = window.location.href;

  let isSeries = false;
  let pageUrl = getWorkUrl(currentUrl, false);
  if (!pageUrl) {
    isSeries = true;
    pageUrl = getSeriesUrl(currentUrl);
  }
  if (!pageUrl) return;

  function isVisible() {
    const bookmarkForm = document.getElementById("bookmark_form_placement");
    if (!bookmarkForm || bookmarkForm.style.display == "none") {
      return false;
    }
    return true;
  }

  async function populateBookmark() {
    const { settings = {} } = await browser.storage.local.get("settings");
    if (!settings.general?.populateBookmark) return;

    const bookmarkTextBox = document.getElementById("bookmark_notes");
    if (!bookmarkTextBox) return;

    if (
      settings.general?.overrideBookmark ||
      bookmarkTextBox.value.trim().length === 0
    ) {
      createNotifPopup("Getting bookmark info...");

      try {
        bookmarkTextBox.value = getBookmarkNotes(pageUrl, document, isSeries);
        createNotifPopup("Bookmark textbox populated.");
      } catch (err) {
        createNotifPopup(`Could not populate bookmark: ${err.message}`);
      }
    } else {
      createNotifPopup("No population as textbox is already populated");
    }
  }

  async function handleBookmarkClick() {
    if (handleBookmarkClick.listenerAdded) return;

    document.addEventListener("click", (e) => {
      if (e.target.matches("a.bookmark_form_placement_open") && isVisible()) {
        populateBookmark();
      }
    });
    handleBookmarkClick.listenerAdded = true;
  }

  window.AO3BookmarkHandler = handleBookmarkClick;
  handleBookmarkClick();
})();
