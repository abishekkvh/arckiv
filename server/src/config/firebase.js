const { initializeApp, cert } = require('firebase-admin/app');

// Initialize Firebase Admin with credentials from env variables
// The private key needs to have escaped newlines handled properly
let app;
try {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
  console.log('Firebase Admin SDK Initialized');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error.message);
  if (process.env.NODE_ENV === 'production') throw error;
}

module.exports = app;
