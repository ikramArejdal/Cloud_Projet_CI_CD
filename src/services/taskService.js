const { Task } = require('../models');
const { Op } = require('sequelize');

const buildWhereClause = (userId, query) => {
  const where = { user_id: userId };

  if (query.status) {
    const allowed = ['pending', 'in-progress', 'completed'];
    if (!allowed.includes(query.status)) {
      const err = new Error(`Statut invalide. Valeurs acceptées : ${allowed.join(', ')}`);
      err.status = 400;
      throw err;
    }
    where.status = query.status;
  }

  if (query.priority) {
    const allowed = ['low', 'medium', 'high'];
    if (!allowed.includes(query.priority)) {
      const err = new Error(`Priorité invalide. Valeurs acceptées : ${allowed.join(', ')}`);
      err.status = 400;
      throw err;
    }
    where.priority = query.priority;
  }

  if (query.search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.search}%` } },
      { description: { [Op.like]: `%${query.search}%` } },
    ];
  }

  return where;
};

const getAllTasks = async (userId, query = {}) => {
  const where = buildWhereClause(userId, query);
  const order = [['created_at', 'DESC']];

  if (query.sort === 'due_date') order.unshift(['due_date', 'ASC']);
  if (query.sort === 'priority') {
    order.unshift([
      require('sequelize').literal("FIELD(priority, 'high', 'medium', 'low')"),
      'ASC',
    ]);
  }

  return Task.findAll({ where, order });
};

const getTaskById = async (id, userId) => {
  const task = await Task.findOne({ where: { id, user_id: userId } });
  if (!task) {
    const err = new Error('Tâche introuvable');
    err.status = 404;
    throw err;
  }
  return task;
};

const createTask = async (userId, data) => {
  const { title, description, priority, due_date } = data;
  return Task.create({
    title,
    description: description || null,
    priority: priority || 'medium',
    status: 'pending',
    due_date: due_date || null,
    user_id: userId,
  });
};

/**
 * updateTask — si body vide ou pas de champs reconnus → toggle status
 */
const updateTask = async (id, userId, data = {}) => {
  const task = await getTaskById(id, userId);

  const { title, description, priority, status, due_date } = data;
  const hasFields = title || description !== undefined || priority || status || due_date;

  if (!hasFields) {
    // Toggle : pending/in-progress → completed, completed → pending
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await task.update({ status: newStatus });
  } else {
    const updates = {};
    if (title !== undefined)       updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined)    updates.priority    = priority;
    if (status !== undefined)      updates.status      = status;
    if (due_date !== undefined)    updates.due_date    = due_date;
    await task.update(updates);
  }

  return task;
};

const deleteTask = async (id, userId) => {
  const task = await getTaskById(id, userId);
  await task.destroy();
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
