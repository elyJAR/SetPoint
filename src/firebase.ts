import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged, User 
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { 
  getFirestore, doc, setDoc, getDoc 
} from 'firebase/firestore';
import { ScheduleRow } from './types';

// Read configuration from Vite environment variables (.env file)
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
};

// Only initialize if the user actually configured .env
export const isFirebaseConfigured = !!firebaseConfig.apiKey;

let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error("Firebase not configured. Please add config to .env");
  const provider = new GoogleAuthProvider();
  
  if (Capacitor.isNativePlatform()) {
    // Mobile flow: Use redirect (more reliable in WebViews)
    await signInWithRedirect(auth, provider);
    return null; // The app will redirect away
  } else {
    // Web flow: Use popup
    const res = await signInWithPopup(auth, provider);
    return res.user;
  }
}

export async function handleRedirectResult(): Promise<User | null> {
  if (!auth) return null;
  const res = await getRedirectResult(auth);
  return res?.user || null;
}

export async function logout(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function saveToCloud(userId: string, rows: ScheduleRow[]): Promise<void> {
  if (!db) return;
  const userDoc = doc(db, 'user_schedules', userId);
  await setDoc(userDoc, { rows, updatedAt: new Date().toISOString() });
}

export async function loadFromCloud(userId: string): Promise<ScheduleRow[]> {
  if (!db) return [];
  const userDoc = doc(db, 'user_schedules', userId);
  const snap = await getDoc(userDoc);
  if (snap.exists()) {
    return snap.data().rows || [];
  }
  return [];
}

export async function getSharedSchedule(shareId: string): Promise<ScheduleRow[]> {
  if (!db) throw new Error("Firebase not configured.");
  const userDoc = doc(db, 'user_schedules', shareId);
  const snap = await getDoc(userDoc);
  if (snap.exists()) {
    return snap.data().rows || [];
  }
  throw new Error("Shared schedule not found.");
}
