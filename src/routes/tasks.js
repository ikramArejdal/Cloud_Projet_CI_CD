const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { authenticate } = require('../middlewares/auth');

// Toutes les routes tâches nécessitent une authentification
router.use(authenticate);

/**
 * GET /api/tasks
 */
router.get('/', async (req, res, next) => {
  try {
    const tasks = await taskService.getAllTasks(req.user.id, req.query);
    // Frontend attend : { success, tasks }
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user.id);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Body : { title }
 */
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Le titre est requis' });
    }
    const task = await taskService.createTask(req.user.id, req.body);
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Toggle ou mise à jour — Body optionnel
 */
router.put('/:id', async (req, res, next) => {
  try {
    // Si le body est vide → toggle du statut
    const task = await taskService.updateTask(req.params.id, req.user.id, req.body);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user.id);
    res.json({ success: true, message: 'Tâche supprimée avec succès' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
