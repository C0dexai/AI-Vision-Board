import { openDB, IDBPDatabase } from 'idb';
import { VisionItem, ChatMessage } from '../types';

const DB_NAME = 'ai-vision-board-db';
const DB_VERSION = 2; // Incremented for schema change
const VISION_ITEMS_STORE = 'vision_items';
const CHAT_HISTORIES_STORE = 'chat_histories';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(VISION_ITEMS_STORE)) {
            db.createObjectStore(VISION_ITEMS_STORE, { keyPath: 'id' });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(CHAT_HISTORIES_STORE)) {
            // Store chat history objects with agentName as the key
            db.createObjectStore(CHAT_HISTORIES_STORE, { keyPath: 'agentName' });
          }
        }
      },
    });
  }
  return dbPromise;
};

// Vision Items CRUD
export const getAllVisionItems = async (): Promise<VisionItem[]> => {
  const db = await getDb();
  return db.getAll(VISION_ITEMS_STORE);
};

export const saveVisionItem = async (item: VisionItem): Promise<void> => {
  const db = await getDb();
  await db.put(VISION_ITEMS_STORE, item);
};

export const deleteVisionItem = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(VISION_ITEMS_STORE, id);
};

// Chat History CRUD
export const getChatHistory = async (agentName: string): Promise<ChatMessage[]> => {
  const db = await getDb();
  const result = await db.get(CHAT_HISTORIES_STORE, agentName);
  return result?.history || [];
};

export const saveChatHistory = async (agentName: string, history: ChatMessage[]): Promise<void> => {
  const db = await getDb();
  // We store an object with agentName as keyPath and history as a property
  await db.put(CHAT_HISTORIES_STORE, { agentName, history });
};
