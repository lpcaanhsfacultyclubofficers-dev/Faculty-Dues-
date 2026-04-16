import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  getAuth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocFromServer, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Use React Native persistence for Auth with fallback
export const auth = getAuth(app);
/*
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  console.warn("Firebase Auth initialization with persistence failed, falling back to default.", e);
  authInstance = getAuth(app);
}

export const auth = authInstance;
*/
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  firebaseConfig,
  signInWithPopup, 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
  getDocFromServer,
  writeBatch
};

export type { User };

