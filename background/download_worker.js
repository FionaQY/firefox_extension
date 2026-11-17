/* globals browser */
import { mutateTasks, readTasks, updateTask } from "../src/storage/tasks";
import { CancelledError, runTask } from "../src/download/download_tasks";

const FINISHED = new Set(["done", "partial", "failed", "cancelled"]);

const cancelled = new Set();
let running = false;
let again = false;

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const emptyTally = () => ({ downloaded: 0, skipped: 0, failed: 0 });

/* ---------- queue ---------- */

async function enqueue(task) {
  const entry = {
    id: newId(),
    label: task.label || "Download",
    kind: task.kind === "listing" ? "listing" : "items",
    items: task.items || [],
    url: task.url || "",
    listingLabel: task.listingLabel || "",
    options: task.options || {},
    status: "queued",
    progress: "Waiting in queue",
    tally: emptyTally(),
    failedItems: [],
    errors: [],
    createdAt: Date.now(),
  };
  await mutateTasks((tasks) => [...tasks, entry]);
  kick();
}

function makeContext(id) {
  return {
    isCancelled: () => cancelled.has(id),
    setStatus: (text) => {
      updateTask(id, { progress: text }).catch(console.error);
    },
    logError: (message) => {
      updateTask(id, (t) => ({
        errors: [...(t.errors || []), message].slice(-30),
      })).catch(console.error);
    },
  };
}

async function runOne(task) {
  const { id } = task;
  await updateTask(id, {
    status: "running",
    startedAt: Date.now(),
    finishedAt: null,
    progress: "Starting...",
  });

  try {
    const tally = await runTask(task, makeContext(id));
    const status = tally.failed
      ? tally.downloaded
        ? "partial"
        : "failed"
      : "done";
    await updateTask(id, {
      status,
      finishedAt: Date.now(),
      tally: {
        downloaded: tally.downloaded,
        skipped: tally.skipped,
        failed: tally.failed,
      },
      failedItems: tally.failedItems,
    });
  } catch (error) {
    if (error instanceof CancelledError) {
      await updateTask(id, {
        status: "cancelled",
        progress: "Cancelled",
        finishedAt: Date.now(),
      });
    } else {
      console.error("AO3 download task failed", error);
      await updateTask(id, (t) => ({
        status: "failed",
        progress: `Failed: ${error?.message || error}`,
        finishedAt: Date.now(),
        errors: [...(t.errors || []), String(error?.message || error)].slice(
          -30,
        ),
      }));
    }
  } finally {
    cancelled.delete(id);
  }
}

/** Run queued tasks one at a time (a single queue keeps AO3 request rate low). */
async function kick() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      let next;
      while ((next = (await readTasks()).find((t) => t.status === "queued"))) {
        await runOne(next);
      }
    } while (again);
  } finally {
    running = false;
  }
}

/* ---------- commands from the status page ---------- */

async function handleCommand({ command, id }) {
  if (command === "clearFinished") {
    await mutateTasks((tasks) => tasks.filter((t) => !FINISHED.has(t.status)));
    return;
  }

  const task = (await readTasks()).find((t) => t.id === id);
  if (!task) return;

  if (command === "cancel") {
    if (task.status === "queued") {
      await updateTask(id, {
        status: "cancelled",
        progress: "Cancelled",
        finishedAt: Date.now(),
      });
    } else if (task.status === "running") {
      cancelled.add(id);
      await updateTask(id, { progress: "Cancelling..." });
    }
  } else if (command === "retry" && FINISHED.has(task.status)) {
    cancelled.delete(id);
    await updateTask(id, {
      status: "queued",
      progress: "Waiting in queue",
      tally: emptyTally(),
      failedItems: [],
      errors: [],
      startedAt: null,
      finishedAt: null,
    });
    kick();
  } else if (command === "remove" && task.status !== "running") {
    await mutateTasks((tasks) => tasks.filter((t) => t.id !== id));
  }
}

/* ---------- wiring ---------- */

// Fire-and-forget messages. We return nothing so we never shadow the other listener.
browser.runtime.onMessage.addListener((msg) => {
  switch (msg?.action) {
    case "enqueueDownload":
      enqueue(msg.task).catch(console.error);
      break;
    case "taskCommand":
      handleCommand(msg).catch(console.error);
      break;
  }
  return undefined;
});

// Resume anything that was mid-run when the browser or extension restarted.
mutateTasks((tasks) =>
  tasks.map((t) =>
    t.status === "running"
      ? { ...t, status: "queued", progress: "Resuming after restart" }
      : t,
  ),
)
  .then(kick)
  .catch(console.error);
