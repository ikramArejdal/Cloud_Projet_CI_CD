const User = require('./User');
const Task = require('./Task');

User.hasMany(Task, { foreignKey: 'user_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Task };