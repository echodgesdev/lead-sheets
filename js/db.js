const NAME = 'tabs';
const STORE = 'songs';
let opening = null;

function open() {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

function run(mode, op) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = op(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export async function dbAll() {
  return run('readonly', (store) => store.getAll());
}

export async function dbGet(id) {
  return run('readonly', (store) => store.get(id));
}

export async function dbPut(rec) {
  return run('readwrite', (store) => store.put(rec));
}

export async function dbDelete(id) {
  return run('readwrite', (store) => store.delete(id));
}
