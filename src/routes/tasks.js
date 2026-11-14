const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const tasks = require('../controllers/taskController');

const router = Router();

// All task routes require a valid Firebase ID token.
router.use(requireAuth);

router.get('/', tasks.listTasks);
router.get('/:id', tasks.getTask);
router.post('/', tasks.createTask);
router.patch('/:id', tasks.updateTask);
router.delete('/:id', tasks.deleteTask);

module.exports = router;
