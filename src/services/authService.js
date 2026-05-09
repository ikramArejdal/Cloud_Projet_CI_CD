const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Inscription — attend { username, password }
 */
const register = async ({ username, password }) => {
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    const err = new Error("Ce nom d'utilisateur est déjà utilisé");
    err.status = 409;
    throw err;
  }
  const user = await User.create({ username, password });
  const token = generateToken(user.id);
  return { user, token };
};

/**
 * Connexion — attend { username, password }
 */
const login = async ({ username, password }) => {
  const user = await User.findOne({ where: { username } });
  if (!user) {
    const err = new Error("Nom d'utilisateur ou mot de passe incorrect");
    err.status = 401;
    throw err;
  }
  const valid = await user.comparePassword(password);
  if (!valid) {
    const err = new Error("Nom d'utilisateur ou mot de passe incorrect");
    err.status = 401;
    throw err;
  }
  const token = generateToken(user.id);
  return { user, token };
};

/**
 * Profil utilisateur
 */
const getProfile = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }
  return user;
};

module.exports = { register, login, getProfile };
