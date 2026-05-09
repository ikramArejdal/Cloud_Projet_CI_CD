const errorHandler = (err, req, res, next) => {
  // Erreurs Sequelize de validation
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Erreur d'unicité (ex: email en double)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: 'Cette valeur est déjà utilisée' });
  }

  const status = err.status || 500;
  const message = err.message || 'Erreur serveur interne';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${status}] ${message}`, err.stack);
  }

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;