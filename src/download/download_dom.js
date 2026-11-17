export function el(tag, className = "", text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function button(text, onClick, extraClass = "") {
  const b = el("button", `ao3-control-button ${extraClass}`.trim(), text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

export function checkboxField(text) {
  const label = el("label", "ao3-field-container checkbox");
  const input = el("input", "ao3-field-checkbox");
  input.type = "checkbox";
  label.append(input, el("span", "ao3-field-label", text));
  return { label, input };
}
