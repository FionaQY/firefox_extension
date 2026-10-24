/* globals browser */
import { workToDocument, documentToDataUrl } from "./helper/download.js";
import { safeFilename } from "./helper/commons.js";
import { extractWorkData } from "./helper/extractor.js";

(async () => {
  const work = extractWorkData(document, window.location.href);
  const docx = workToDocument(work);
  const url = await documentToDataUrl(docx);
  browser.runtime.sendMessage({
    action: "downloadDoc",
    url,
    filename: `${safeFilename(work.title)}_${safeFilename(work.author)}.docx`,
  });
})();
