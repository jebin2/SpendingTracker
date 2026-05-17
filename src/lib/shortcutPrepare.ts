// In-memory store for shortcut install prepare IDs.
// Maps a short UUID → the full shortcut JWT (which is too long to put in a URL).
// Entries expire after 10 minutes — enough time for the Shortcuts app to download
// the file after the user taps "Install Shortcut".

interface PrepareEntry {
  token: string;
  expiresAt: number;
}

const store = new Map<string, PrepareEntry>();

export function storeShortcutPrepare(token: string): string {
  const id = crypto.randomUUID();
  store.set(id, { token, expiresAt: Date.now() + 10 * 60 * 1000 });
  return id;
}

export function getShortcutPrepare(id: string): string | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(id);
    return null;
  }
  return entry.token;
}
