const NAME = 'tabs';
const VERSION = 2;
export const SONGS = 'songs';
export const SETLISTS = 'setlists';
let opening = null;

function open() {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      for (const name of [SONGS, SETLISTS]) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

function run(storeName, mode, op) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = op(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export async function dbAll(storeName) {
  return run(storeName, 'readonly', (store) => store.getAll());
}

export async function dbPut(storeName, rec) {
  return run(storeName, 'readwrite', (store) => store.put(rec));
}

export async function dbDelete(storeName, id) {
  return run(storeName, 'readwrite', (store) => store.delete(id));
}
