const DB_NAME = "aipoger-q-crash-upload";
const STORE_NAME = "pending-audio";
const RECORD_KEY = "current";

type PendingAudioRecord = {
  key: string;
  blob: Blob;
  fileName: string;
  contentType: string;
  savedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("瀏覽器不支援暫存音檔。"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("暫存音檔失敗。"));
  });
}

export async function savePendingQCrashAudio(file: File) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      key: RECORD_KEY,
      blob: file,
      fileName: file.name,
      contentType: file.type || "audio/mpeg",
      savedAt: Date.now(),
    } satisfies PendingAudioRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("暫存音檔失敗。"));
  });
  database.close();
}

export async function readPendingQCrashAudio() {
  const database = await openDatabase();
  const record = await new Promise<PendingAudioRecord | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve((request.result as PendingAudioRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("讀取暫存音檔失敗。"));
  });
  database.close();
  if (!record?.blob) return null;
  return new File([record.blob], record.fileName, { type: record.contentType || record.blob.type || "audio/mpeg" });
}

export async function clearPendingQCrashAudio() {
  if (typeof window === "undefined" || !window.indexedDB) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("清除暫存音檔失敗。"));
  });
  database.close();
}
