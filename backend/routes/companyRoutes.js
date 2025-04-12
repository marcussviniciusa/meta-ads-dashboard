const express = require('express');
const { 
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  addMetaAccount,
  removeMetaAccount
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de proteção a todas as rotas
router.use(protect);

// Rotas para empresas
router
  .route('/')
  .get(getCompanies) // Permitir que qualquer usuário autenticado acesse a lista de empresas
  .post(authorize('superadmin'), createCompany);

router
  .route('/:id')
  .get(getCompany) // Permitir que qualquer usuário autenticado acesse os detalhes da empresa
  .put(authorize('superadmin'), updateCompany)
  .delete(authorize('superadmin'), deleteCompany);

// Rotas para gerenciar contas do Meta Ads
router
  .route('/:id/meta-accounts')
  .post(authorize('superadmin'), addMetaAccount);

router
  .route('/:id/meta-accounts/:accountId')
  .delete(authorize('superadmin'), removeMetaAccount);

// Rota alternativa para compatibilidade com o frontend
router
  .route('/:id/adaccounts')
  .post(authorize('superadmin'), addMetaAccount);

module.exports = router;
