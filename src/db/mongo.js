const { MongoClient } = require('mongodb');
const env = require('../config/env');

// Cached at module level so warm serverless invocations reuse the same connection.
let clientPromise = null;
let indexesReady = null;

function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(env.mongoUri(), {
      maxPoolSize: 5, // small pool – plenty for the Atlas free tier
      serverSelectionTimeoutMS: 8000,
    });
    clientPromise = client.connect().catch((err) => {
      clientPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db(env.mongoDbName());
}

// Returns the "tasks" collection, creating the index once per cold start.
async function getTasksCollection() {
  const db = await getDb();
  const tasks = db.collection('tasks');
  if (!indexesReady) {
    indexesReady = tasks.createIndex({ userId: 1, createdAt: -1 }).catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  await indexesReady;
  return tasks;
}

module.exports = { getDb, getTasksCollection };
