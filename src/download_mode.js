/* globals browser */
import { workToDocument, documentToDataUrl } from "./helper/download.js";
import { safeFilename } from "./helper/commons.js";

(async () => {
  const {
    title,
    author,
    document: docx,
  } = workToDocument(document, window.location.href);
  const url = await documentToDataUrl(docx);
  browser.runtime.sendMessage({
    action: "downloadDoc",
    url,
    filename: `${safeFilename(title)}_${safeFilename(author)}.docx`,
  });
})();
