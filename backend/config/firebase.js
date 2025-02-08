const admin = require('firebase-admin');
const path = require('path');

const initializeFirebase = () => {
  if (admin.apps.length) {
    return admin;
  }

  let serviceAccount;

  if (process.env.NODE_ENV === 'production') {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
      process.exit(1);
    }
    serviceAccount = JSON.parse(
      Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
    );
  } else {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'path/to/local/serviceAccountKey.json';
    try {
      serviceAccount = require(path.resolve(serviceAccountPath));
    } catch (error) {
      console.error('Failed to load service account key:', error);
      process.exit(1);
    }
  }

  // Pass the storageBucket property from environment variable
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // e.g., "your-project-id.appspot.com"
  });

  return admin;
};

// Initialize Firebase and get Firestore instance
initializeFirebase();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = { 
  admin,
  initializeFirebase,
  db
};
