const Company = require('../models/Company');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Obter todas as empresas
// @route   GET /api/companies
// @access  Private/SuperAdmin
exports.getCompanies = asyncHandler(async (req, res, next) => {
  const companies = await Company.find({});

  res.status(200).json({
    success: true,
    count: companies.length,
    data: companies
  });
});

// @desc    Obter uma empresa específica
// @route   GET /api/companies/:id
// @access  Private/SuperAdmin
exports.getCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: company
  });
});

// @desc    Criar uma nova empresa
// @route   POST /api/companies
// @access  Private/SuperAdmin
exports.createCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.create(req.body);

  res.status(201).json({
    success: true,
    data: company
  });
});

// @desc    Atualizar uma empresa
// @route   PUT /api/companies/:id
// @access  Private/SuperAdmin
exports.updateCompany = asyncHandler(async (req, res, next) => {
  let company = await Company.findById(req.params.id);

  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${req.params.id}`, 404));
  }

  company = await Company.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: company
  });
});

// @desc    Excluir uma empresa
// @route   DELETE /api/companies/:id
// @access  Private/SuperAdmin
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${req.params.id}`, 404));
  }

  await company.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Adicionar conta de anúncios do Meta a uma empresa
// @route   POST /api/companies/:id/meta-accounts
// @access  Private/SuperAdmin
exports.addMetaAccount = asyncHandler(async (req, res, next) => {
  const { accountId, name, accessToken } = req.body;

  if (!accountId || !accessToken) {
    return next(new ErrorResponse('Por favor, forneça ID da conta e token de acesso', 400));
  }

  const company = await Company.findById(req.params.id);

  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${req.params.id}`, 404));
  }

  // Verificar se a conta já existe
  const existingAccount = company.metaAdAccounts.find(
    account => account.accountId === accountId
  );

  if (existingAccount) {
    return next(new ErrorResponse('Esta conta de anúncios já está registrada', 400));
  }

  // Adicionar nova conta
  company.metaAdAccounts.push({
    accountId,
    name: name || `Conta ${accountId}`,
    accessToken,
    status: 'active',
    lastSync: null
  });

  await company.save();

  res.status(200).json({
    success: true,
    data: company
  });
});

// @desc    Remover conta de anúncios do Meta de uma empresa
// @route   DELETE /api/companies/:id/meta-accounts/:accountId
// @access  Private/SuperAdmin
exports.removeMetaAccount = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${req.params.id}`, 404));
  }

  // Encontrar o índice da conta a ser removida
  const accountIndex = company.metaAdAccounts.findIndex(
    account => account.accountId === req.params.accountId
  );

  if (accountIndex === -1) {
    return next(new ErrorResponse('Conta de anúncios não encontrada', 404));
  }

  // Remover a conta
  company.metaAdAccounts.splice(accountIndex, 1);
  await company.save();

  res.status(200).json({
    success: true,
    data: company
  });
});
