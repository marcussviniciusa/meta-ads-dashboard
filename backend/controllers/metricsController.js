const axios = require('axios');
const moment = require('moment');
const Company = require('../models/Company');
const MetricsData = require('../models/MetricsData');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Função para sanitizar valores numéricos e evitar NaN
function sanitizeNumber(value) {
  // Se o valor for NaN, undefined, null ou não numérico, retornar 0
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return value;
}

// Função para sanitizar o array de ações
function sanitizeActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }
  
  // Filtrar e transformar as ações para garantir que são válidas
  return actions.map(action => ({
    action_type: action.action_type || 'unknown',
    value: sanitizeNumber(parseFloat(action.value || 0))
  })).filter(action => action.action_type !== 'unknown' || action.value > 0);
}

// Função auxiliar para extrair compras dos dados de ações
function extractPurchasesFromActions(metric) {
  // Simplifiquei a função para focar apenas no que sabemos que funciona
  
  // Verificar se existem ações e procurar por compras
  if (metric.actions && Array.isArray(metric.actions)) {
    // Tipos de ações que podem indicar compras
    const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase'];
    
    // Procurar por qualquer ação que seja de compra
    for (const action of metric.actions) {
      if (purchaseTypes.includes(action.action_type) || action.action_type.includes('purchase')) {
        return sanitizeNumber(parseInt(action.value || 0));
      }
    }
  }
  
  // Se não encontrou compras nas ações, verificar se existe um campo direto de conversões
  if (metric.conversions && typeof metric.conversions === 'number') {
    // Assumir que conversões representam compras para fins de demonstração
    // Para um ambiente de produção, isso precisaria ser ajustado conforme os dados reais
    return sanitizeNumber(parseInt(metric.conversions));
  }
  
  // Se nenhum valor for encontrado
  return 0;
}

// @desc    Obter métricas da conta de anúncios do Meta
// @route   GET /api/metrics/:companyId/:adAccountId
// @access  Private
exports.getMetrics = asyncHandler(async (req, res, next) => {
  const { companyId, adAccountId } = req.params;
  const { 
    startDate, 
    endDate, 
    level = 'account', 
    objectId = null,
    forceRefresh = false 
  } = req.query;

  // Validar parâmetros de data
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Por favor, forneça datas de início e fim', 400));
  }

  // Verificar se a empresa existe e se o usuário tem acesso a ela
  const company = await Company.findById(companyId);
  
  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${companyId}`, 404));
  }

  // Se o usuário não for um superadmin, verificar se ele pertence à empresa
  if (req.user.role !== 'superadmin' && req.user.company.toString() !== companyId) {
    return next(new ErrorResponse('Não autorizado a acessar dados desta empresa', 403));
  }

  // Encontrar a conta de anúncios específica dentro da empresa
  const adAccount = company.metaAdAccounts.find(
    account => account.accountId === adAccountId
  );

  if (!adAccount) {
    return next(new ErrorResponse(`Conta de anúncios não encontrada com id ${adAccountId}`, 404));
  }

  try {
    let metrics;
    
    // Se forceRefresh não estiver ativado, tentar buscar do banco de dados primeiro
    if (!forceRefresh) {
      const query = {
        company: companyId,
        adAccountId,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        level
      };
      
      // Se for específico para um objeto (campanha, adset, ad), filtrar pelo ID do objeto
      if (objectId && level !== 'account') {
        query.objectId = objectId;
      }
      
      metrics = await MetricsData.find(query).sort('date');
      
      // Se os dados existirem no banco e não estiverem obsoletos, retorná-los
      if (metrics.length > 0) {
        return res.status(200).json({
          success: true,
          count: metrics.length,
          data: metrics,
          source: 'database'
        });
      }
    }
    
    // Se os dados não existirem no banco ou forceRefresh estiver ativado, buscar da API do Meta
    const metricsData = await fetchMetricsFromMeta(
      adAccount, 
      startDate, 
      endDate, 
      level, 
      objectId
    );
    
    // Salvar as métricas no banco de dados
    if (metricsData && metricsData.length > 0) {
      // Para cada métrica recebida, criar ou atualizar no banco
      const savedMetrics = await Promise.all(
        metricsData.map(async (metric) => {
          const metricData = {
            company: companyId,
            adAccountId,
            date: new Date(metric.date_start),
            level,
            objectId: metric.object_id || adAccountId,
            objectName: metric.object_name || adAccount.name,
            metrics: {
              // Sanitizar todos os valores numéricos para evitar NaN
              impressions: sanitizeNumber(parseInt(metric.impressions || 0)),
              clicks: sanitizeNumber(parseInt(metric.clicks || 0)),
              spend: sanitizeNumber(parseFloat(metric.spend || 0)),
              cpc: sanitizeNumber(parseFloat(metric.cpc || 0)),
              cpm: sanitizeNumber(parseFloat(metric.cpm || 0)),
              ctr: sanitizeNumber(parseFloat(metric.ctr || 0)),
              reach: sanitizeNumber(parseInt(metric.reach || 0)),
              frequency: sanitizeNumber(parseFloat(metric.frequency || 0)),
              unique_clicks: sanitizeNumber(parseInt(metric.unique_clicks || 0)),
              unique_ctr: sanitizeNumber(parseFloat(metric.unique_ctr || 0)),
              cost_per_unique_click: sanitizeNumber(parseFloat(metric.cost_per_unique_click || 0)),
              conversions: sanitizeNumber(parseInt(metric.conversions || 0)),
              cost_per_conversion: sanitizeNumber(parseFloat(metric.cost_per_conversion || 0)),
              conversion_rate: sanitizeNumber(parseFloat(metric.conversion_rate || 0)),
              // Extrair compras dos dados de ações (actions)
              purchases: sanitizeNumber(extractPurchasesFromActions(metric)),
              // Incluir o array completo de ações para processamento no frontend se necessário
              actions: sanitizeActions(metric.actions || [])
            },
            syncInfo: {
              syncedAt: new Date(),
              syncStatus: 'success'
            }
          };

          // Armazenar métricas adicionais em um objeto separado
          const additionalMetrics = {};
          Object.keys(metric).forEach(key => {
            if (!['impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr', 'reach', 
                 'frequency', 'unique_clicks', 'unique_ctr', 'cost_per_unique_click',
                 'conversions', 'cost_per_conversion', 'conversion_rate', 
                 'date_start', 'date_stop', 'object_id', 'object_name'].includes(key)) {
              additionalMetrics[key] = metric[key];
            }
          });
          
          if (Object.keys(additionalMetrics).length > 0) {
            metricData.additionalMetrics = additionalMetrics;
          }

          // Verificar se já existe um registro para esta data, nível e objeto
          const existingMetric = await MetricsData.findOne({
            company: companyId,
            adAccountId,
            date: new Date(metric.date_start),
            level,
            objectId: metric.object_id || adAccountId
          });

          if (existingMetric) {
            // Atualizar o registro existente
            Object.assign(existingMetric, metricData);
            return await existingMetric.save();
          } else {
            // Criar um novo registro
            return await MetricsData.create(metricData);
          }
        })
      );

      // Atualizar informação de última sincronização na conta
      adAccount.lastSync = new Date();
      adAccount.syncStatus = 'completed';
      await company.save();

      return res.status(200).json({
        success: true,
        count: savedMetrics.length,
        data: savedMetrics,
        source: 'api'
      });
    } else {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'Sem dados disponíveis para o período solicitado'
      });
    }
  } catch (error) {
    // Atualizar status de sincronização em caso de erro
    if (adAccount) {
      adAccount.syncStatus = 'failed';
      adAccount.syncError = error.message || 'Erro ao sincronizar com a API do Meta';
      await company.save();
    }

    return next(new ErrorResponse('Erro ao obter métricas: ' + error.message, 500));
  }
});

// @desc    Sincronizar métricas de todas as contas de anúncios de uma empresa
// @route   POST /api/metrics/sync/:companyId
// @access  Private/SuperAdmin
exports.syncCompanyMetrics = asyncHandler(async (req, res, next) => {
  const { companyId } = req.params;
  const { days = 30 } = req.body;

  // Verificar se a empresa existe
  const company = await Company.findById(companyId);
  
  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${companyId}`, 404));
  }

  // Verificar se há contas de anúncios para sincronizar
  if (!company.metaAdAccounts || company.metaAdAccounts.length === 0) {
    return next(new ErrorResponse('Não há contas de anúncios para sincronizar', 400));
  }

  // Definir período de sincronização
  const endDate = moment().format('YYYY-MM-DD');
  const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');

  // Atualizar status de sincronização para todas as contas
  company.metaAdAccounts.forEach(account => {
    account.syncStatus = 'syncing';
  });
  await company.save();

  // Iniciar processo de sincronização assíncrona
  res.status(200).json({
    success: true,
    message: `Sincronização iniciada para ${company.metaAdAccounts.length} contas de anúncios`,
    data: {
      company: companyId,
      startDate,
      endDate,
      accounts: company.metaAdAccounts.map(a => a.accountId)
    }
  });

  // Executar sincronização em background
  try {
    for (const account of company.metaAdAccounts) {
      await syncAccountMetrics(company._id, account, startDate, endDate);
    }
  } catch (error) {
    console.error(`Erro na sincronização em background: ${error.message}`);
  }
});

// Função auxiliar para buscar métricas da API do Meta
async function fetchMetricsFromMeta(adAccount, startDate, endDate, level = 'account', objectId = null) {
  // Construir a URL da API do Meta
  let endpoint;
  // Usar apenas os campos principais e suportados pela API para evitar erro 400
  let fields = 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,unique_clicks,conversions,actions';
  
  // Definir o endpoint com base no nível
  switch (level) {
    case 'campaign':
      endpoint = objectId 
        ? `/${objectId}/insights` 
        : `/act_${adAccount.accountId}/campaigns`;
      break;
    case 'adset':
      endpoint = objectId 
        ? `/${objectId}/insights` 
        : `/act_${adAccount.accountId}/adsets`;
      break;
    case 'ad':
      endpoint = objectId 
        ? `/${objectId}/insights` 
        : `/act_${adAccount.accountId}/ads`;
      break;
    default: // 'account'
      endpoint = `/act_${adAccount.accountId}/insights`;
  }

  // Construir parâmetros da solicitação
  const params = new URLSearchParams({
    access_token: adAccount.accessToken,
    fields,
    time_range: JSON.stringify({
      since: moment(startDate).format('YYYY-MM-DD'),
      until: moment(endDate).format('YYYY-MM-DD')
    }),
    level: level,
    time_increment: 1  // Dados diários
  });

  // Se estiver buscando uma lista de objetos (campanhas, conjuntos de anúncios, anúncios)
  if (!objectId && level !== 'account') {
    params.set('fields', 'id,name,status');
    params.delete('time_range');
    params.delete('time_increment');
    params.delete('level');
  }

  try {
    const url = `https://graph.facebook.com/${process.env.META_API_VERSION}${endpoint}?${params}`;
    const response = await axios.get(url);
    
    let data = response.data.data || [];
    let paging = response.data.paging;
    
    // Para listas de objetos, buscar insights para cada um
    if (!objectId && level !== 'account' && data.length > 0) {
      const allInsights = [];
      
      for (const obj of data) {
        try {
          const insightsParams = new URLSearchParams({
            access_token: adAccount.accessToken,
            fields,
            time_range: JSON.stringify({
              since: startDate,
              until: endDate
            }),
            time_increment: 1
          });
          
          const insightsUrl = `https://graph.facebook.com/${process.env.META_API_VERSION}/${obj.id}/insights?${insightsParams}`;
          const insightsResponse = await axios.get(insightsUrl);
          
          const objInsights = insightsResponse.data.data || [];
          
          // Adicionar informações do objeto a cada insight
          objInsights.forEach(insight => {
            insight.object_id = obj.id;
            insight.object_name = obj.name;
          });
          
          allInsights.push(...objInsights);
        } catch (error) {
          console.error(`Erro ao buscar insights para ${level} ${obj.id}: ${error.message}`);
        }
      }
      
      return allInsights;
    }
    
    // Lidar com paginação para conjuntos grandes de dados
    while (paging && paging.next) {
      try {
        const nextResponse = await axios.get(paging.next);
        const nextData = nextResponse.data.data || [];
        data = [...data, ...nextData];
        paging = nextResponse.data.paging;
      } catch (error) {
        console.error(`Erro na paginação: ${error.message}`);
        break;
      }
    }
    
    // Adicionar log simples para debug
    if (data.length > 0) {
      console.log(`Recebidos ${data.length} registros de métricas da API do Facebook`);
      
      // Log simplificado para verificar a estrutura sem imprimir grandes objetos
      if (data[0].actions) {
        const actionTypes = data[0].actions.map(a => a.action_type);
        console.log('Tipos de ações disponíveis:', actionTypes.join(', '));
        
        // Simplificar o log de compras
        const hasPurchases = actionTypes.some(type => 
          type === 'purchase' || type.includes('purchase')
        );
        console.log('Contém ações de compra:', hasPurchases ? 'Sim' : 'Não');
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar métricas da API do Meta: ${error.message}`);
    throw new Error(`Falha na API do Meta: ${error.message}`);
  }
}

// Função auxiliar para sincronizar métricas de uma conta específica
async function syncAccountMetrics(companyId, account, startDate, endDate) {
  try {
    // Atualizar status para sincronizando
    const company = await Company.findById(companyId);
    const adAccount = company.metaAdAccounts.find(a => a.accountId === account.accountId);
    adAccount.syncStatus = 'syncing';
    await company.save();

    // Buscar métricas da API
    const metricsData = await fetchMetricsFromMeta(
      account, 
      startDate, 
      endDate, 
      'account'
    );

    // Processar e salvar métricas
    if (metricsData && metricsData.length > 0) {
      for (const metric of metricsData) {
        const metricData = {
          company: companyId,
          adAccountId: account.accountId,
          date: new Date(metric.date_start),
          level: 'account',
          objectId: account.accountId,
          objectName: account.name,
          metrics: {
            impressions: parseInt(metric.impressions || 0),
            clicks: parseInt(metric.clicks || 0),
            spend: parseFloat(metric.spend || 0),
            cpc: parseFloat(metric.cpc || 0),
            cpm: parseFloat(metric.cpm || 0),
            ctr: parseFloat(metric.ctr || 0),
            reach: parseInt(metric.reach || 0),
            frequency: parseFloat(metric.frequency || 0),
            unique_clicks: parseInt(metric.unique_clicks || 0)
          },
          syncInfo: {
            syncedAt: new Date(),
            syncStatus: 'success'
          }
        };

        // Verificar se já existe um registro para esta data, nível e objeto
        const existingMetric = await MetricsData.findOne({
          company: companyId,
          adAccountId: account.accountId,
          date: new Date(metric.date_start),
          level: 'account',
          objectId: account.accountId
        });

        if (existingMetric) {
          // Atualizar o registro existente
          Object.assign(existingMetric, metricData);
          await existingMetric.save();
        } else {
          // Criar um novo registro
          await MetricsData.create(metricData);
        }
      }
    }

    // Buscar métricas por campanha
    const campaignMetrics = await fetchMetricsFromMeta(
      account, 
      startDate, 
      endDate, 
      'campaign'
    );

    if (campaignMetrics && campaignMetrics.length > 0) {
      // Processar dados de campanha de forma similar...
      // (código similar ao de cima, mas com level = 'campaign')
    }

    // Atualizar status de sincronização
    adAccount.lastSync = new Date();
    adAccount.syncStatus = 'completed';
    adAccount.syncError = null;
    await company.save();

    return true;
  } catch (error) {
    // Atualizar status para erro
    const company = await Company.findById(companyId);
    const adAccount = company.metaAdAccounts.find(a => a.accountId === account.accountId);
    adAccount.syncStatus = 'failed';
    adAccount.syncError = error.message || 'Erro desconhecido durante a sincronização';
    await company.save();

    console.error(`Erro ao sincronizar conta ${account.accountId}: ${error.message}`);
    return false;
  }
}
