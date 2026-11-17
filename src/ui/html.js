export function parseHtmlFragment(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  for (const node of Array.from(doc.body.childNodes)) {
    fragment.appendChild(node);
  }
  return fragment;
}
