// Reads configuration from environment variables.
// Values are read lazily so a missing variable gives a clear error only when it is needed.

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  mongoUri: () => required('MONGODB_URI'),
  mongoDbName: () => process.env.MONGODB_DB_NAME || 'taskflow',
  firebase: () => ({
    projectId: required('FIREBASE_PROJECT_ID'),
    clientEmail: required('FIREBASE_CLIENT_EMAIL'),
    // Netlify/.env store the key with literal "\n" – convert them to real newlines.
    privateKey: required('FIREBASE_PRIVATE_KEY')
      .replace(/^"|"$/g, '')
      .replace(/\\n/g, '\n'),
  }),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
