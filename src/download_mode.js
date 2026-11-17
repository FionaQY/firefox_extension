/* globals browser */
import { workToDocument, documentToDataUrl } from "./download/docx_builder";
import { safeFilename } from "./utils/text";
import { extractWorkData } from "./ao3/work";

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
