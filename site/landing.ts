const rootScope = new URL("./", document.baseURI).href;

async function retireLegacyRootServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => registration.scope === rootScope)
        .map((registration) => registration.unregister()),
    );
  } catch {
    // Landing remains usable even when service-worker APIs are unavailable or denied.
  }
}

void retireLegacyRootServiceWorker();
