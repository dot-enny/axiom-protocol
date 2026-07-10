import {
  getAddress,
  isAllowed,
  isConnected,
  setAllowed,
} from "@stellar/freighter-api";

/**
 * Requests access to the user's Freighter wallet and returns their public
 * address. Throws with a human-readable message if the extension isn't
 * installed, access is denied, or Freighter reports an error at any step.
 *
 * Note: freighter-api v6 replaced the older `getPublicKey()` with
 * `getAddress()` — same purpose, different name.
 */
export async function connectFreighterWallet(): Promise<string> {
  const connected = await isConnected();
  if (connected.error || !connected.isConnected) {
    throw new Error("Freighter extension not found.");
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
