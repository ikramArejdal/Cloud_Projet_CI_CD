const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: { msg: "Ce nom d'utilisateur est déjà utilisé" },
    validate: {
      notEmpty: { msg: "Le nom d'utilisateur est obligatoire" },
      len: { args: [3, 50], msg: "Le nom d'utilisateur doit faire entre 3 et 50 caractères" },
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: { args: [4, 255], msg: 'Le mot de passe doit faire au moins 4 caractères' },
    },
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Ne jamais exposer le mot de passe dans les réponses JSON
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
