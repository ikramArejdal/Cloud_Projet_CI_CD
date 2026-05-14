const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middlewares/auth');

/**
 * POST /api/auth/register
 * Body : { username, password }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'username et password sont requis' });
    }
    if (username.length < 10) {
      return res.status(400).json({ success: false, error: "Le nom d'utilisateur doit faire au moins 10 caractères" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit faire au moins 4 caractères' });
    }

    const { user, token } = await authService.register({ username, password });
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body : { username, password }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'username et password sont requis' });
    }

    const { user, token } = await authService.login({ username, password });
    res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
