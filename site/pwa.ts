const SERVICE_WORKER_URL = "./sw.js";
const SERVICE_WORKER_SCOPE = "./";

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  void navigator.serviceWorker
    .register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: "none",
    })
    .catch(() => undefined);
}

window.addEventListener("load", registerServiceWorker, { once: true });
