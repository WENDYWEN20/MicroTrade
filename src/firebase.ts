import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection, 
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

// Initialize Firestore with specific database ID if applicable, otherwise use default
export const db = getFirestore(app);

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
  const userDocRef = doc(db, "users", userId);
  await setDoc(userDocRef, { portfolio }, { merge: true });
}

// Load Portfolio from Firestore
export async function loadPortfolioFromDb(userId: string): Promise<Portfolio | null> {
  const userDocRef = doc(db, "users", userId);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists() && docSnap.data().portfolio) {
    return docSnap.data().portfolio as Portfolio;
  }
  return null;
}

// Save Limit Orders to Firestore
export async function saveLimitOrdersToDb(userId: string, limitOrders: any[]): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  await setDoc(userDocRef, { limitOrders }, { merge: true });
}

// Load Limit Orders from Firestore
export async function loadLimitOrdersFromDb(userId: string): Promise<any[] | null> {
  const userDocRef = doc(db, "users", userId);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists() && docSnap.data().limitOrders) {
    return docSnap.data().limitOrders;
  }
  return null;
}

// Live real-time listener for user profile from Firestore
export function subscribeToUserData(userId: string, callback: (data: { portfolio?: Portfolio; limitOrders?: any[] }) => void) {
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  });
}
