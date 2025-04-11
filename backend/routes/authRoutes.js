const express = require('express');
const { 
  register, 
  login, 
  getMe, 
  logout,
  metaAuth,
  metaAuthCallback
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Rotas públicas
router.post('/register', register);
router.post('/login', login);
router.get('/meta', metaAuth);
router.get('/meta/callback', metaAuthCallback);

// Rotas protegidas
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

module.exports = router;
