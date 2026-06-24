import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from "firebase/firestore";
import { Portfolio } from "./types";

// Firebase App Configuration (sourced from firebase-applet-config.json)
const firebaseConfig = {
  projectId: "sample-firebase-ai-app-b16bb",
  appId: "1:991739302078:web:0b5164ef159bbb03594eef",
  apiKey: "AIzaSyBg_T41o9acpFrc-e7gAvwSNrHJ9u4NOWc",
  authDomain: "sample-firebase-ai-app-b16bb.firebaseapp.com",
  databaseId: "ai-studio-ab422bf7-481d-408b-907c-1aa16fffe1ef",
  storageBucket: "sample-firebase-ai-app-b16bb.firebasestorage.app",
  messagingSenderId: "991739302078"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (CRITICAL: Named databases require this!)
export const db = getFirestore(app, firebaseConfig.databaseId);

// --- Mandatory Firestore Error Handling Implementation ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: localStorage.getItem("microtrade_user_id"), // Since we use local simulated auth
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Get or create persistent User ID from LocalStorage for local user session separation
export function getOrCreateUserId(): string {
  let userId = localStorage.getItem("microtrade_user_id");
  if (!userId) {
    userId = "user_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("microtrade_user_id", userId);
  }
  return userId;
}

// Save Portfolio to Firestore
export async function savePortfolioToDb(userId: string, portfolio: Portfolio): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { portfolio }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load Portfolio from Firestore
export async function loadPortfolioFromDb(userId: string): Promise<Portfolio | null> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists() && docSnap.data().portfolio) {
      return docSnap.data().portfolio as Portfolio;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Save Limit Orders to Firestore
export async function saveLimitOrdersToDb(userId: string, limitOrders: any[]): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { limitOrders }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load Limit Orders from Firestore
export async function loadLimitOrdersFromDb(userId: string): Promise<any[] | null> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists() && docSnap.data().limitOrders) {
      return docSnap.data().limitOrders;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Live real-time listener for user profile from Firestore
export function subscribeToUserData(userId: string, callback: (data: { portfolio?: Portfolio; limitOrders?: any[] }) => void) {
  const path = `users/${userId}`;
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}
