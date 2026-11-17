/* globals browser */
export const TASKS_KEY = "downloadTasks";
const MAX_FINISHED = 50;
const ACTIVE = new Set(["queued", "running"]);

let writeQueue = Promise.resolve();

export async function readTasks() {
  const { [TASKS_KEY]: tasks } = await browser.storage.local.get(TASKS_KEY);
  return Array.isArray(tasks) ? tasks : [];
}

/** Serialized read-modify-write. `fn` receives the task array and returns the new one. */
export function mutateTasks(fn) {
  const run = async () => {
    const tasks = await readTasks();
    const next = fn(tasks) ?? tasks;
    const finished = next.filter((t) => !ACTIVE.has(t.status));
    const keep = new Set(finished.slice(-MAX_FINISHED));
    const trimmed = next.filter((t) => ACTIVE.has(t.status) || keep.has(t));
    await browser.storage.local.set({ [TASKS_KEY]: trimmed });
    return trimmed;
  };
  writeQueue = writeQueue.catch(() => {}).then(run);
  return writeQueue;
}

/** Patch one task. `patch` is an object or a function (task) => object. */
export function updateTask(id, patch) {
  return mutateTasks((tasks) =>
    tasks.map((task) =>
      task.id === id
        ? { ...task, ...(typeof patch === "function" ? patch(task) : patch) }
        : task,
    ),
  );
}
