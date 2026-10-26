/* globals browser */
import { createPopupContainer } from "./helper/popup";
import { MOBILE_MAX_WIDTH } from "./helper/popup_fields";

const TASKS_KEY = "downloadTasks";
const POPUP_ID = "ao3-qof-download-status-popup";
const LABELS = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  partial: "Done with errors",
  failed: "Failed",
  cancelled: "Cancelled",
};
const BADGE_COLORS = {
  running: "#2b7de955",
  done: "#2ea04355",
  partial: "#d9a40055",
  failed: "#d7332f55",
};

const send = (message) => browser.runtime.sendMessage(message);
const command = (name, id) =>
  send({ action: "taskCommand", command: name, id });

function el(tag, text, css = "") {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (css) node.style.cssText = css;
  return node;
}

function button(text, onClick) {
  const b = el("button", text, "cursor:pointer;margin-right:6px");
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function renderTask(task) {
  const row = el("div", null, "border-top:1px solid #8884;padding:8px 0");

  const top = el("div", null, "display:flex;gap:8px;align-items:center");
  top.append(
    el("span", task.label, "flex:1;font-weight:600;overflow-wrap:anywhere"),
    el(
      "span",
      LABELS[task.status] || task.status,
      `font-size:12px;padding:1px 8px;border-radius:99px;background:${
        BADGE_COLORS[task.status] || "#8883"
      }`,
    ),
  );
  row.append(
    top,
    el(
      "div",
      task.progress || "",
      "margin:4px 0;opacity:.85;overflow-wrap:anywhere",
    ),
  );

  const { downloaded = 0, skipped = 0, failed = 0 } = task.tally || {};
  if (downloaded || skipped || failed) {
    row.append(
      el(
        "div",
        `${downloaded} downloaded, ${skipped} skipped, ${failed} failed`,
        "font-size:12px;opacity:.7;margin-bottom:4px",
      ),
    );
  }

  if (task.errors?.length) {
    const details = el("details", null, "font-size:12px;margin:4px 0");
    details.append(el("summary", `${task.errors.length} error(s)`));
    for (const message of task.errors) details.append(el("div", message));
    row.append(details);
  }

  const actions = el("div");
  if (task.status === "queued" || task.status === "running") {
    actions.append(button("Cancel", () => command("cancel", task.id)));
  } else {
    actions.append(button("Retry", () => command("retry", task.id)));
  }
  if (task.status !== "running") {
    actions.append(button("Remove", () => command("remove", task.id)));
  }
  row.append(actions);
  return row;
}

function renderInto(content, tasks) {
  content.replaceChildren();

  const header = el(
    "div",
    null,
    "display:flex;align-items:center;margin-bottom:8px",
  );
  header.append(
    el("strong", `Download queue (${tasks.length})`, "flex:1"),
    button("Clear finished", () => command("clearFinished")),
  );
  content.append(header);

  if (!tasks.length) {
    content.append(
      el("div", "No download tasks yet.", "opacity:.7;padding:12px 0"),
    );
    return;
  }

  const isActive = (t) => t.status === "running" || t.status === "queued";
  const active = tasks.filter(isActive);
  const finished = tasks.filter((t) => !isActive(t)).reverse();
  for (const task of [...active, ...finished]) content.append(renderTask(task));
}

(async () => {
  document.getElementById(POPUP_ID)?.remove();

  const content = el(
    "div",
    null,
    "max-height:70vh;overflow:auto;min-width:280px",
  );
  const { [TASKS_KEY]: stored } = await browser.storage.local.get(TASKS_KEY);
  renderInto(content, Array.isArray(stored) ? stored : []);

  const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
  const popup = createPopupContainer(POPUP_ID, isMobile, {
    content,
    extraClasses: ["download-status"],
  });
  document.body.appendChild(popup);

  const onChanged = (changes, area) => {
    if (!popup.isConnected) {
      browser.storage.onChanged.removeListener(onChanged);
      return;
    }
    if (area === "local" && changes[TASKS_KEY]) {
      renderInto(content, changes[TASKS_KEY].newValue || []);
    }
  };
  browser.storage.onChanged.addListener(onChanged);
})();
