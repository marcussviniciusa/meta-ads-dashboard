const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const axios = require('axios');
require('dotenv').config();

// Função para gerar dados mock de anúncios
const generateMockAds = () => {
  // Criar anúncios com datas distribuídas nos últimos 60 dias
  const now = new Date();
  
  return {
    data: Array(20).fill().map((_, index) => {
      // Distribuir as datas aleatoriamente nos últimos 60 dias
      const daysAgo = Math.floor(Math.random() * 60);
      const createdDate = new Date(now);
      createdDate.setDate(createdDate.getDate() - daysAgo);
      
      return {
        id: `ad_${index}`,
        name: `Anúncio de Teste ${index + 1}`,
        status: Math.random() > 0.7 ? 'PAUSED' : 'ACTIVE',
        effective_status: Math.random() > 0.7 ? 'PAUSED' : 'ACTIVE',
        preview_url: `https://www.facebook.com/ads/archive/render_ad/?id=${100000000000 + index}`,
        created_time: createdDate.toISOString(),
        updated_time: new Date(createdDate.getTime() + Math.random() * 86400000 * 5).toISOString(),
        insights: {
          data: [{
            impressions: Math.floor(Math.random() * 10000),
            clicks: Math.floor(Math.random() * 500),
            ctr: (Math.random() * 5).toFixed(2),
            cpc: (Math.random() * 2 + 0.5).toFixed(2),
            spend: (Math.random() * 1000 + 100).toFixed(2)
          }]
        }
      };
    })
  };
};

// Rota para buscar anúncios de uma conta específica
router.get('/:adAccountId', protect, async (req, res) => {
  // Em ambiente de desenvolvimento, retornar dados mock a menos que FORCE_REAL_DATA esteja definido
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_REAL_DATA !== 'true') {
    console.log('Usando dados mock para anúncios no ambiente de desenvolvimento');
    return res.json({
      success: true,
      data: generateMockAds(),
      isMock: true
    });
  }
  
  try {
    const { adAccountId } = req.params;
    const { limit, startDate, endDate } = req.query;
    
    console.log('Parâmetros de filtro por data:', { startDate, endDate });
    
    // Verificar se temos um token de acesso do Facebook
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      console.log('Token de acesso do Facebook não configurado, usando dados mock');
      return res.json({
        success: true,
        data: generateMockAds(),
        isMock: true
      });
    }
    
    // Definir campos expandidos para obter informações completas dos anúncios
    // Ignorar o parâmetro fields enviado pelo frontend
    // Adicionar created_time e updated_time para permitir filtragem por data
    const expandedFields = 'name,status,effective_status,preview_url,created_time,updated_time,creative{thumbnail_url,image_url,body,object_url},adcreatives{thumbnail_url,image_url},adlabels,insights';

    // Construir a URL para a API do Facebook
    // Adicionar prefixo 'act_' se ainda não tiver
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const apiUrl = `https://graph.facebook.com/v18.0/${formattedAccountId}/ads`;
    
    // Usar sempre os campos expandidos, independentemente do que o frontend enviar
    const queryParams = new URLSearchParams({
      access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      fields: expandedFields,
      limit: limit || 50
    });
    
    // Adicionar filtros de data se fornecidos
    if (startDate) {
      queryParams.append('filtering', JSON.stringify([{
        field: 'created_time',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: new Date(startDate).toISOString()
      }]));
    }
    
    if (endDate) {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1); // Incluir o dia final completo
      
      queryParams.append('filtering', JSON.stringify([{
        field: 'created_time',
        operator: 'LESS_THAN',
        value: nextDay.toISOString()
      }]));
    }
    
    const queryString = queryParams.toString();

    // Construir a URL completa para a requisição
    const fullUrl = `${apiUrl}?${queryString}`;
    
    // Log mais claro da requisição sendo feita
    console.log('======== REQUISIÇÃO PARA API DO FACEBOOK ========');
    console.log(`URL: ${apiUrl}`);
    console.log(`Parâmetros: ${JSON.stringify({
      access_token: '[REDACTED]',
      fields: expandedFields,
      limit: limit || 50,
      startDate: startDate || 'não especificado',
      endDate: endDate || 'não especificado'
    }, null, 2)}`);
    
    // Fazer a requisição para a API do Facebook
    const response = await axios.get(fullUrl);
    
    // Log detalhado da resposta
    console.log('Resposta da API do Facebook:');
    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Dados:',  JSON.stringify(response.data, null, 2));
    console.log('Total de anúncios retornados:', response.data?.data?.length || 0);
    
    // Verificar se há anúncios ativos
    const activeAds = response.data?.data?.filter(ad => ad.effective_status === 'ACTIVE' || ad.status === 'ACTIVE');
    console.log('Total de anúncios ativos:', activeAds?.length || 0);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Erro ao buscar anúncios:', error.response?.data || error.message);
    
    // Se a solicitação para a API do Facebook falhar, retornar dados mock
    res.json({
      success: true,
      data: generateMockAds(),
      isMock: true
    });
  }
});

module.exports = router;
