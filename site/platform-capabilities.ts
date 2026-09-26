type FileHandleLike = {
  getFile(): Promise<File>;
};

type WritableFileHandleLike = {
  createWritable(): Promise<{
    write(data: Blob | string): Promise<void>;
    close(): Promise<void>;
  }>;
};

type InstallPromptEventLike = Event & {
  prompt(): Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

type LaunchParamsLike = {
  files?: FileHandleLike[];
};

type LaunchQueueLike = {
  setConsumer(consumer: (params: LaunchParamsLike) => void | Promise<void>): void;
};

type WakeLockSentinelLike = {
  released?: boolean;
  release(): Promise<void>;
  addEventListener?(type: "release", listener: () => void, options?: AddEventListenerOptions): void;
};

const PROJECT_FILE_TYPES = [
  {
    description: "Lūm project",
    accept: {
      "application/json": [".luum", ".json"],
    },
  },
];

let installPrompt: InstallPromptEventLike | null = null;
const installAvailabilityListeners = new Set<(available: boolean) => void>();

let wakeLock: WakeLockSentinelLike | null = null;
let wakeLockDesired = false;

function notifyInstallAvailability(): void {
  const available = Boolean(installPrompt);
  for (const listener of installAvailabilityListeners) listener(available);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event as InstallPromptEventLike;
  notifyInstallAvailability();
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  notifyInstallAvailability();
});

export function observeInstallAvailability(listener: (available: boolean) => void): () => void {
  installAvailabilityListeners.add(listener);
  listener(Boolean(installPrompt));
  return () => installAvailabilityListeners.delete(listener);
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = installPrompt;
  if (!prompt) return "unavailable";

  installPrompt = null;
  notifyInstallAvailability();
  const result = await prompt.prompt();
  return result.outcome;
}

export function supportsNativeProjectOpen(): boolean {
  return typeof Reflect.get(window, "showOpenFilePicker") === "function";
}

export async function openNativeProjectFile(): Promise<File | null> {
  const picker = Reflect.get(window, "showOpenFilePicker");
  if (typeof picker !== "function") return null;

  try {
    const handles = (await Reflect.apply(picker, window, [
      {
        multiple: false,
        types: PROJECT_FILE_TYPES,
        excludeAcceptAllOption: false,
      },
    ])) as FileHandleLike[];
    return handles[0] ? await handles[0].getFile() : null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}

export async function saveNativeProjectFile(
  content: string,
  suggestedName: string,
): Promise<"saved" | "cancelled" | "unsupported"> {
  const picker = Reflect.get(window, "showSaveFilePicker");
  if (typeof picker !== "function") return "unsupported";

  try {
    const handle = (await Reflect.apply(picker, window, [
      {
        suggestedName,
        types: PROJECT_FILE_TYPES,
        excludeAcceptAllOption: false,
      },
    ])) as WritableFileHandleLike;
    const writable = await handle.createWritable();
    await writable.write(new Blob([content], { type: "application/json;charset=utf-8" }));
    await writable.close();
    return "saved";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

export function canShareProjectFile(): boolean {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  const probe = new File(["{}"], "project.luum", { type: "application/json" });
  return navigator.canShare({ files: [probe] });
}

export async function shareProjectFile(
  content: string,
  filename: string,
  title: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
    return "unsupported";
  }

  const file = new File([content], filename, { type: "application/json" });
  if (!navigator.canShare({ files: [file] })) return "unsupported";

  try {
    await navigator.share({
      title,
      text: "Lūm project",
      files: [file],
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

export function registerProjectLaunchConsumer(
  consumer: (files: File[]) => void | Promise<void>,
): boolean {
  const launchQueue = Reflect.get(window, "launchQueue") as LaunchQueueLike | undefined;
  if (!launchQueue || typeof launchQueue.setConsumer !== "function") return false;

  launchQueue.setConsumer(async (params) => {
    const handles = Array.isArray(params.files) ? params.files : [];
    if (!handles.length) return;
    const files = await Promise.all(handles.map((handle) => handle.getFile()));
    await consumer(files);
  });
  return true;
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

async function acquireWakeLock(): Promise<void> {
  if (!wakeLockDesired || document.visibilityState !== "visible" || wakeLock) return;
  const wakeLockManager = Reflect.get(navigator, "wakeLock") as
    | { request(type: "screen"): Promise<WakeLockSentinelLike> }
    | undefined;
  if (!wakeLockManager) return;

  try {
    wakeLock = await wakeLockManager.request("screen");
    wakeLock.addEventListener?.(
      "release",
      () => {
        wakeLock = null;
        if (wakeLockDesired && document.visibilityState === "visible") {
          void acquireWakeLock();
        }
      },
      { once: true },
    );
  } catch {
    wakeLock = null;
  }
}

export function setPresentationWakeLock(active: boolean): void {
  wakeLockDesired = active;
  if (active) {
    void acquireWakeLock();
    return;
  }

  const current = wakeLock;
  wakeLock = null;
  if (current && !current.released) void current.release();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLockDesired) {
    void acquireWakeLock();
  }
});

window.addEventListener(
  "pagehide",
  () => {
    setPresentationWakeLock(false);
  },
  { once: true },
);
