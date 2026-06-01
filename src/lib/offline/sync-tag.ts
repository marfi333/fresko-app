export const SYNC_TAG = "fresko-sync";

/**
 * Message posted from the SW to all clients when a `sync` event fires. Client
 * code listens for this on `navigator.serviceWorker` and invokes the runner.
 */
export const SYNC_MESSAGE = "fresko-sync-please-drain" as const;

type SyncManagerLike = {
  register: (tag: string) => Promise<void>;
};

type ServiceWorkerRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: SyncManagerLike;
};

/**
 * Asks the service worker to fire a `sync` event with our tag once the device
 * is online. Resolves to `true` if the registration succeeded, `false`
 * otherwise (Safari, no SW yet, etc.). Caller should fall back to direct
 * online/focus triggers in the `false` case.
 */
export const requestBackgroundSync = async (): Promise<boolean> => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithSync;
    if (!reg.sync) return false;
    await reg.sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
};
