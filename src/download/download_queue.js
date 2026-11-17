/* globals browser */
import { el, button } from "./download_dom";

const TASKS_KEY = "downloadTasks";
const LABELS = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  partial: "Done with errors",
  failed: "Failed",
  cancelled: "Cancelled",
};

const command = (name, id) =>
  browser.runtime.sendMessage({ action: "taskCommand", command: name, id });

function renderTask(task) {
  const row = el("div", "ao3-status-row");

  const top = el("div", "ao3-status-top");
  top.append(
    el("span", "ao3-status-label", task.label),
    el(
      "span",
      `ao3-status-badge ${task.status}`,
      LABELS[task.status] || task.status,
    ),
  );
  row.append(top, el("div", "ao3-status-progress", task.progress || ""));

  const { downloaded = 0, skipped = 0, failed = 0 } = task.tally || {};
  if (downloaded || skipped || failed) {
    row.append(
      el(
        "div",
        "ao3-status-tally",
        `${downloaded} downloaded, ${skipped} skipped, ${failed} failed`,
      ),
    );
  }

  if (task.errors?.length) {
    const details = el("details", "ao3-status-errors");
    details.append(el("summary", "", `${task.errors.length} error(s)`));
    for (const message of task.errors) details.append(el("div", "", message));
    row.append(details);
  }

  const actions = el("div", "ao3-status-actions");
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

function renderInto(container, tasks) {
  container.replaceChildren();

  const header = el("div", "ao3-status-header");
  header.append(
    el("span", "ao3-status-title", `Download queue (${tasks.length})`),
    button("Clear finished", () => command("clearFinished")),
  );
  container.append(header);

  if (!tasks.length) {
    container.append(el("div", "ao3-status-empty", "No download tasks yet."));
    return;
  }

  const isActive = (t) => t.status === "running" || t.status === "queued";
  const active = tasks.filter(isActive);
  const finished = tasks.filter((t) => !isActive(t)).reverse();
  for (const task of [...active, ...finished])
    container.append(renderTask(task));
}

export function buildQueueView() {
  const element = el("div", "ao3-status-content");

  const onChanged = (changes, area) => {
    if (!element.isConnected) {
      browser.storage.onChanged.removeListener(onChanged);
      return;
    }
    if (area === "local" && changes[TASKS_KEY]) {
      renderInto(element, changes[TASKS_KEY].newValue || []);
    }
  };

  browser.storage.local.get(TASKS_KEY).then(({ [TASKS_KEY]: tasks }) => {
    renderInto(element, Array.isArray(tasks) ? tasks : []);
  });
  browser.storage.onChanged.addListener(onChanged);

  return {
    element,
    dispose: () => browser.storage.onChanged.removeListener(onChanged),
  };
}
