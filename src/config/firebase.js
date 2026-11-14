const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const env = require('./env');

// Initialise Firebase Admin once and reuse it across warm serverless invocations.
function getFirebaseApp() {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(env.firebase()) });
  }
  return getApps()[0];
}

// Verifies a Firebase ID token sent by the Android app and returns the decoded token.
async function verifyIdToken(idToken) {
  return getAuth(getFirebaseApp()).verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
