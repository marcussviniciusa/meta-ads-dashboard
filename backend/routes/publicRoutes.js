const express = require('express');
const router = express.Router();
const { getPublicDashboard } = require('../controllers/sharedLinkController');

// Rotas públicas (não necessitam de autenticação)

// Acessar dashboard compartilhado
router.get('/dashboard/:token', getPublicDashboard);

module.exports = router;
