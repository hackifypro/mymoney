import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { Transaction } from '../types';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB9ysmCXlaHZw02tbhPj9QS8nl2uwNCZXk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mymoney-c8037.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mymoney-c8037",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mymoney-c8037.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "736520130806",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:736520130806:web:6f18f6dc46dfa9086b5cd7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9PRCWB61CM"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Analytics conditionally
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

const COLLECTION_NAME = 'transactions';

/**
 * Fetch all transactions from Firestore
 */
export async function fetchTransactionsFromFirestore(): Promise<Transaction[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('transaction_date', 'desc'));
    const snapshot = await getDocs(q);
    const list: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Transaction);
    });
    return list;
  } catch (error) {
    console.error('Error fetching transactions from Firestore:', error);
    throw error;
  }
}

/**
 * Save a new transaction to Firestore
 */
export async function saveTransactionToFirestore(transaction: Transaction): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, transaction.id);
    await setDoc(docRef, transaction);
  } catch (error) {
    console.error('Error saving transaction to Firestore:', error);
    throw error;
  }
}

/**
 * Update an existing transaction in Firestore
 */
export async function updateTransactionInFirestore(id: string, updates: Partial<Transaction>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates as any);
  } catch (error) {
    console.error('Error updating transaction in Firestore:', error);
    throw error;
  }
}

/**
 * Delete a specific transaction by ID from Firestore
 */
export async function deleteTransactionFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting transaction from Firestore:', error);
    throw error;
  }
}

/**
 * Real-time listener for transactions
 */
export function subscribeToFirestoreTransactions(
  onData: (transactions: Transaction[]) => void,
  onError?: (error: any) => void
) {
  const q = query(collection(db, COLLECTION_NAME), orderBy('transaction_date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Transaction);
      });
      onData(list);
    },
    (err) => {
      console.error('Firestore snapshot listener error:', err);
      if (onError) onError(err);
    }
  );
}
