/* globals browser */
import {
  buildQuery,
  getValue,
  setValue,
  getParams,
  addValue,
  addMissingId,
} from "./helper/params";
import { getWorkUrl, fetchDoc, textOf } from "./helper/commons";
import { isValid, extractRelevantData } from "./helper/extractor";
import { createNotifPopup } from "./helper/popup";

(() => {
  const workUrl = getWorkUrl(window.location.href);
  if (workUrl != "") {
    // if a work page
    createNotifPopup("Cannot block tag on this page");
    return;
  }
  if (typeof window.AO3BlockerHandler === "function") {
    return;
  }

  const WAITTIME = 4000;

  let clickedOnce = false;

  function getBlockedUrl(e) {
    const baseUrl = e.target.baseURI;

    let searchParams = getParams(new URL(baseUrl));
    const blockedTag = textOf(e.target);
    createNotifPopup(`Blocking tag ${blockedTag}...`);
    searchParams = addValue(
      searchParams,
      "work_search[excluded_tag_names]",
      blockedTag,
    );
    searchParams = addMissingId(searchParams, baseUrl);
    return {
      url: `https://archiveofourown.org/works?${buildQuery(searchParams)}`,
      page: searchParams["page"],
      filterType: searchParams["work_search[sort_column]"],
    };
  }

  function blockAuthorUrl(e) {
    const baseUrl = e.target.baseURI;

    let searchParams = getParams(new URL(baseUrl));
    const rawAuthor = textOf(e.target);

    const authorName = rawAuthor.match(/\((.*?)\)/)?.[1] || rawAuthor;
    createNotifPopup(`Blocking author ${authorName}...`);

    let currentQuery = getValue(searchParams, "work_search[query]");
    currentQuery = `${currentQuery.trim()} -creators:${authorName}`;
    searchParams = setValue(
      searchParams,
      "work_search[query]",
      currentQuery.trim(),
    );
    searchParams = addMissingId(searchParams, baseUrl);

    return {
      url: `https://archiveofourown.org/works?${buildQuery(searchParams)}`,
      page: searchParams["page"],
      filterType: searchParams["work_search[sort_column]"],
    };
  }

  function sleep() {
    return new Promise((resolve) => setTimeout(resolve, WAITTIME));
  }

  async function binarySearchWorks(
    tagUrl,
    relevantData,
    filterType,
    minPages,
    maxPages = 100,
  ) {
    let low = minPages,
      high = maxPages;
    let result = low;

    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      await sleep();
      const isValidPage = await checkPageForWork(
        tagUrl,
        mid,
        relevantData,
        filterType,
      );

      if (isValidPage) {
        low = mid + 1;
        result = mid;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }

  async function checkPageForWork(url, page, relevantData, filterType) {
    createNotifPopup(`Checking page ${page}..`);
    const doc = await fetchDoc(`${url}&page=${page}`);
    return [...doc.querySelectorAll(".work")]
      .slice(1)
      .some((work) =>
        isValid(relevantData, extractRelevantData(work, filterType)),
      );
  }

  async function handleTagClick(e) {
    const blockUser = e.target.matches('a[href*="/users/"]');
    if (!e.target.matches('a[href*="/tags/"][href*="/works"]') && !blockUser) {
      createNotifPopup(`You did not click a tag/user...`);
      return;
    }
    if (clickedOnce) {
      createNotifPopup("Clicked once already.");
      return;
    }

    const { url, page, filterType } = blockUser
      ? blockAuthorUrl(e)
      : getBlockedUrl(e);
    e.preventDefault();
    e.stopImmediatePropagation();
    clickedOnce = true;

    if (filterType == "created_at") {
      createNotifPopup("Scrolling doesn`t work on `Date Created`");
      window.location.href = url;
      return;
    }

    const relevantData = extractRelevantData(e.target.offsetParent, filterType);
    try {
      let correctPage = page;
      if (page != 1) {
        let isValidPage = await checkPageForWork(
          url,
          correctPage,
          relevantData,
          filterType,
        );
        if (!isValidPage) {
          correctPage = correctPage - 1;
          isValidPage = await checkPageForWork(
            url,
            correctPage,
            relevantData,
            filterType,
          );
        }

        if (!isValidPage) {
          correctPage = await binarySearchWorks(
            url,
            relevantData,
            filterType,
            2,
            correctPage - 1,
          );
        }
      }
      const target = `${url}&page=${correctPage}`;

      await sleep();
      browser.runtime.sendMessage({
        action: "scrollPage",
        targetUrl: target,
        data: {
          filterType: filterType,
          targetValue: JSON.stringify(relevantData),
        },
      });
      window.location.href = target;
      return;
    } catch (error) {
      createNotifPopup(`Failed: ${error.message}`);
    }
  }

  window.AO3BlockerHandler = handleTagClick;
  document.addEventListener("click", handleTagClick, { capture: true });
})();
