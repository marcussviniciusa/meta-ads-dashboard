const SharedLink = require('../models/SharedLink');
const MetricsData = require('../models/MetricsData');
const Company = require('../models/Company');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Criar um novo link compartilhável para dashboard
 * @route   POST /api/shared-links
 * @access  Private (requer autenticação)
 */
const createSharedLink = asyncHandler(async (req, res, next) => {
  const { 
    name, 
    description, 
    companyId, 
    adAccountId, 
    dateRange,
    selectedMetrics = ['impressions', 'clicks', 'spend', 'ctr', 'cpc'],
    expiryDays = 90
  } = req.body;

  // Validar se a empresa existe
  const company = await Company.findById(companyId);
  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${companyId}`, 404));
  }

  // Verificar se o usuário tem permissão para criar links para esta empresa
  // Superadmins podem criar links para qualquer empresa, usuários comuns apenas para a sua própria
  if (req.user.role !== 'superadmin' && req.user.company?.toString() !== companyId) {
    return next(new ErrorResponse(`Sem permissão para criar links para esta empresa`, 403));
  }

  // Validar se a conta de anúncio está associada a esta empresa
  const adAccount = company.metaAdAccounts.find(acc => acc.accountId === adAccountId);
  if (!adAccount) {
    return next(new ErrorResponse(`Conta de anúncio não encontrada para esta empresa`, 404));
  }

  // Definir data de expiração
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // Preparar o objeto de período
  let dateRangeObj = {};
  if (dateRange.type === 'custom') {
    dateRangeObj = {
      type: 'custom',
      startDate: new Date(dateRange.startDate),
      endDate: new Date(dateRange.endDate)
    };
  } else {
    dateRangeObj = {
      type: dateRange.type || 'last30days'
    };
  }

  // Criar o link compartilhável
  const sharedLink = await SharedLink.create({
    name,
    description,
    companyId,
    adAccountId,
    dateRange: dateRangeObj,
    selectedMetrics,
    expiresAt,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: sharedLink
  });
});

/**
 * @desc    Listar todos os links compartilháveis do usuário
 * @route   GET /api/shared-links
 * @access  Private
 */
const getSharedLinks = asyncHandler(async (req, res, next) => {
  let query = {};
  
  // Se não for super admin, mostrar apenas links criados pelo usuário
  if (req.user.role !== 'superadmin') {
    query.createdBy = req.user._id;
  }

  const sharedLinks = await SharedLink.find(query)
    .populate('companyId', 'name')
    .populate('createdBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: sharedLinks.length,
    data: sharedLinks
  });
});

/**
 * @desc    Buscar um link compartilhável pelo ID
 * @route   GET /api/shared-links/:id
 * @access  Private
 */
const getSharedLink = asyncHandler(async (req, res, next) => {
  const sharedLink = await SharedLink.findById(req.params.id)
    .populate('companyId', 'name')
    .populate('createdBy', 'name');

  if (!sharedLink) {
    return next(new ErrorResponse(`Link compartilhável não encontrado com id ${req.params.id}`, 404));
  }

  // Verificar permissão
  if (req.user.role !== 'superadmin' && sharedLink.createdBy.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse(`Acesso não autorizado a este recurso`, 403));
  }

  res.status(200).json({
    success: true,
    data: sharedLink
  });
});

/**
 * @desc    Atualizar um link compartilhável
 * @route   PUT /api/shared-links/:id
 * @access  Private
 */
const updateSharedLink = asyncHandler(async (req, res, next) => {
  let sharedLink = await SharedLink.findById(req.params.id);

  if (!sharedLink) {
    return next(new ErrorResponse(`Link compartilhável não encontrado com id ${req.params.id}`, 404));
  }

  // Verificar permissão
  if (req.user.role !== 'superadmin' && sharedLink.createdBy.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse(`Acesso não autorizado a este recurso`, 403));
  }

  // Campos que podem ser atualizados
  const { 
    name, 
    description, 
    isActive, 
    dateRange,
    selectedMetrics,
    expiryDays
  } = req.body;

  const updateData = {};
  
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (selectedMetrics) updateData.selectedMetrics = selectedMetrics;
  
  // Atualizar data de expiração se solicitado
  if (expiryDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    updateData.expiresAt = expiresAt;
  }

  // Atualizar período, se fornecido
  if (dateRange) {
    if (dateRange.type === 'custom') {
      updateData.dateRange = {
        type: 'custom',
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate)
      };
    } else {
      updateData.dateRange = {
        type: dateRange.type
      };
    }
  }

  sharedLink = await SharedLink.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: sharedLink
  });
});

/**
 * @desc    Excluir um link compartilhável
 * @route   DELETE /api/shared-links/:id
 * @access  Private
 */
const deleteSharedLink = asyncHandler(async (req, res, next) => {
  const sharedLink = await SharedLink.findById(req.params.id);

  if (!sharedLink) {
    return next(new ErrorResponse(`Link compartilhável não encontrado com id ${req.params.id}`, 404));
  }

  // Verificar permissão
  if (req.user.role !== 'superadmin' && sharedLink.createdBy.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse(`Acesso não autorizado a este recurso`, 403));
  }

  await sharedLink.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Acessar dados do dashboard por token (público, sem autenticação)
 * @route   GET /api/public/dashboard/:token
 * @access  Public
 */
const getPublicDashboard = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  // Buscar o link pelo token
  const sharedLink = await SharedLink.findOne({ token }).populate('companyId', 'name');

  if (!sharedLink) {
    return next(new ErrorResponse(`Link inválido ou expirado`, 404));
  }

  // Verificar se o link está ativo e não expirou
  if (!sharedLink.isActive || sharedLink.isExpired()) {
    return next(new ErrorResponse(`Este link expirou ou foi desativado`, 403));
  }

  // Calcular o período de datas com base no tipo de período
  let startDate, endDate;
  
  if (sharedLink.dateRange.type === 'custom') {
    startDate = sharedLink.dateRange.startDate;
    endDate = sharedLink.dateRange.endDate;
  } else {
    // Período dinâmico baseado no tipo
    endDate = new Date();
    startDate = new Date();
    
    switch(sharedLink.dateRange.type) {
      case 'last7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'last30days':
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
  }

  // Formatar datas para a consulta
  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];

  // Buscar métricas para o período especificado
  const metrics = await MetricsData.find({
    company: sharedLink.companyId,
    adAccountId: sharedLink.adAccountId,
    date: {
      $gte: formattedStartDate,
      $lte: formattedEndDate
    }
  }).sort('date');

  // Verificar se encontrou métricas
  if (!metrics || metrics.length === 0) {
    return next(new ErrorResponse(`Não foram encontradas métricas para o período especificado`, 404));
  }

  // Calcular métricas agregadas
  const aggregatedMetrics = calculateAggregatedMetrics(metrics, sharedLink.selectedMetrics);

  // Retornar os dados do dashboard
  res.status(200).json({
    success: true,
    data: {
      company: sharedLink.companyId.name,
      adAccountId: sharedLink.adAccountId,
      dateRange: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        type: sharedLink.dateRange.type
      },
      selectedMetrics: sharedLink.selectedMetrics,
      metrics,
      aggregatedMetrics
    }
  });
});

/**
 * Calcular métricas agregadas com base nos dados brutos
 */
const calculateAggregatedMetrics = (metrics, selectedMetrics) => {
  // Inicializar objeto para armazenar métricas agregadas
  const aggregated = {};
  
  // Inicializar as métricas selecionadas com zero
  selectedMetrics.forEach(metric => {
    aggregated[metric] = 0;
  });

  // Somar todas as métricas do período
  metrics.forEach(day => {
    selectedMetrics.forEach(metric => {
      if (day.metrics && day.metrics[metric] !== undefined) {
        aggregated[metric] += parseFloat(day.metrics[metric]) || 0;
      }
    });
  });

  // Calcular métricas derivadas se as métricas base estiverem disponíveis
  if (selectedMetrics.includes('impressions') && selectedMetrics.includes('clicks')) {
    aggregated.ctr = (aggregated.clicks / aggregated.impressions) * 100;
  }
  
  if (selectedMetrics.includes('clicks') && selectedMetrics.includes('spend')) {
    aggregated.cpc = aggregated.spend / aggregated.clicks;
  }
  
  if (selectedMetrics.includes('impressions') && selectedMetrics.includes('spend')) {
    aggregated.cpm = (aggregated.spend / aggregated.impressions) * 1000;
  }
  
  if (selectedMetrics.includes('impressions') && selectedMetrics.includes('reach')) {
    aggregated.frequency = aggregated.impressions / aggregated.reach;
  }

  return aggregated;
};

module.exports = {
  createSharedLink,
  getSharedLinks,
  getSharedLink,
  updateSharedLink,
  deleteSharedLink,
  getPublicDashboard
};
