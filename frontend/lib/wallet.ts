import {
  getAddress,
  isAllowed,
  isConnected,
  setAllowed,
} from "@stellar/freighter-api";

/**
 * Thrown specifically when the Freighter browser extension isn't
 * installed at all, as distinct from other connection failures (denied
 * access, an internal Freighter error). The UI offers a different,
 * actionable recovery path for this case — install the wallet — rather
 * than a generic retry.
 */
export class FreighterNotFoundError extends Error {
  constructor() {
    super("Freighter extension not found.");
    this.name = "FreighterNotFoundError";
  }
}

const DETECTION_TIMEOUT_MS = 2500;

/**
 * Checks whether the Freighter extension is installed, without ever
 * hanging forever — `isConnected()` neither resolves nor rejects when
 * there's no extension present to answer it, so this races it against
 * a timeout and treats "no answer in time" as "not installed."
 */
export async function isFreighterInstalled(): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), DETECTION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      isConnected().then((result) => !result.error && result.isConnected),
      timeout,
    ]);
  } catch {
    return false;
  }
}

/**
 * Requests access to the user's Freighter wallet and returns their public
 * address. Throws with a human-readable message if the extension isn't
 * installed, access is denied, or Freighter reports an error at any step.
 *
 * Note: freighter-api v6 replaced the older `getPublicKey()` with
 * `getAddress()` — same purpose, different name.
 */
export async function connectFreighterWallet(): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new FreighterNotFoundError();
  }

  const allowed = await isAllowed();
  if (allowed.error) throw new Error(allowed.error.message);

  if (!allowed.isAllowed) {
    const granted = await setAllowed();
    if (granted.error) throw new Error(granted.error.message);
    if (!granted.isAllowed) throw new Error("Access to Freighter was denied.");
  }

  const result = await getAddress();
  if (result.error) throw new Error(result.error.message);
  return result.address;
}

/**
 * Silently restores a previous Freighter connection on page load, if
 * the extension is installed and this site was already authorized.
 * Never prompts the user — `setAllowed()`, the interactive consent
 * step, is deliberately not called here (unlike `connectFreighterWallet`)
 * so a page reload doesn't surface a permission popup out of nowhere.
 */
export async function checkExistingConnection(): Promise<string | null> {
  try {
    if (!(await isFreighterInstalled())) return null;

    const allowed = await isAllowed();
    if (allowed.error || !allowed.isAllowed) return null;

    const result = await getAddress();
    if (result.error) return null;
    return result.address;
  } catch {
    return null;
  }
}
