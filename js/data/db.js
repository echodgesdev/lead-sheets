const NAME = 'tabs';
const VERSION = 3;
export const SONGS = 'songs';
export const SETLISTS = 'setlists';
export const RECORDINGS = 'recordings';
const STORES = [SONGS, SETLISTS, RECORDINGS];
let opening = null;

function open() {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
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

export async function dbGet(storeName, id) {
  return run(storeName, 'readonly', (store) => store.get(id));
}

export async function dbPut(storeName, rec) {
  return run(storeName, 'readwrite', (store) => store.put(rec));
}

export async function dbDelete(storeName, id) {
  return run(storeName, 'readwrite', (store) => store.delete(id));
}
