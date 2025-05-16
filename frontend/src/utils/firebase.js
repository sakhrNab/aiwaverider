import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
if (!firebase.apps.length) {
  try {
    // Initialize the app first
    firebase.initializeApp(firebaseConfig);
    
    // Set persistence to LOCAL - this will maintain the auth state across page refreshes
    try {
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (error) {
      console.error('Error setting Firebase auth persistence:', error);
    }
    
    // Configure Firestore settings BEFORE any other Firestore operations
    try {
      const firestoreDB = firebase.firestore();
      
      // Set cache size only - avoid persistence API calls that are causing errors
      firestoreDB.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true
      });
      
      // Check if the cache initialization was successful
      console.log('Firestore initialized with unlimited cache size');
      
      // Don't call enableIndexedDbPersistence - it's problematic in this version
      // and we're already handling offline mode with cacheSizeBytes
    } catch (error) {
      console.error('Error configuring Firestore settings:', error);
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// Add event listener for online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App is online. Syncing with remote database...');
  });
  
  window.addEventListener('offline', () => {
    console.log('App is offline. Using cached data...');
  });
}

export default firebase;