const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

/**
 * ⚠️ Temporary MVP hashing on the frontend.
 * This is not fully secure because verification still runs client-side.
 * Next step should move sensitive checks to an Edge Function / RPC.
 */
export const hashSecretCode = async (secretCode: string): Promise<string> => {
  const payload = encoder.encode(secretCode);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return toHex(new Uint8Array(digest));
};
