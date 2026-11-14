const { ObjectId } = require('mongodb');
const { getTasksCollection } = require('../db/mongo');
const { validateTask } = require('../utils/taskValidator');
const ApiError = require('../utils/ApiError');

// Converts a MongoDB document into the JSON shape the Android app receives.
function toTaskResponse(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    description: doc.description,
    priority: doc.priority,
    status: doc.status,
    dueDate: doc.dueDate ? doc.dueDate.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// Parses :id; an invalid id can never match a task, so treat it as 404.
function parseId(id) {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id) {
    throw ApiError.notFound('Task not found');
  }
  return new ObjectId(id);
}

// Every query includes userId so users can only ever touch their own tasks.

// GET /api/tasks
async function listTasks(req, res) {
  const tasks = await getTasksCollection();
  const docs = await tasks.find({ userId: req.user.uid }).sort({ createdAt: -1 }).toArray();
  res.json({ success: true, data: docs.map(toTaskResponse) });
}

// GET /api/tasks/:id
async function getTask(req, res) {
  const tasks = await getTasksCollection();
  const doc = await tasks.findOne({ _id: parseId(req.params.id), userId: req.user.uid });
  if (!doc) throw ApiError.notFound('Task not found');
  res.json({ success: true, data: toTaskResponse(doc) });
}

// POST /api/tasks
async function createTask(req, res) {
  const input = validateTask(req.body);
  const now = new Date();
  const doc = {
    userId: req.user.uid,
    title: input.title,
    description: input.description ?? '',
    priority: input.priority ?? 'MEDIUM',
    status: input.status ?? 'TODO',
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const tasks = await getTasksCollection();
  const result = await tasks.insertOne(doc);
  res.status(201).json({ success: true, data: toTaskResponse({ ...doc, _id: result.insertedId }) });
}

// PATCH /api/tasks/:id
async function updateTask(req, res) {
  const _id = parseId(req.params.id);
  const changes = validateTask(req.body, { partial: true });

  const tasks = await getTasksCollection();
  const doc = await tasks.findOneAndUpdate(
    { _id, userId: req.user.uid },
    { $set: { ...changes, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!doc) throw ApiError.notFound('Task not found');
  res.json({ success: true, data: toTaskResponse(doc) });
}

// DELETE /api/tasks/:id
async function deleteTask(req, res) {
  const _id = parseId(req.params.id);
  const tasks = await getTasksCollection();
  const result = await tasks.deleteOne({ _id, userId: req.user.uid });
  if (result.deletedCount === 0) throw ApiError.notFound('Task not found');
  res.json({ success: true, data: { id: _id.toString() } });
}

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask };
