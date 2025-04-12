const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Pasta para armazenar as imagens baixadas
const adImagesDir = path.join(__dirname, '../public/ad-images');

// Garantir que a pasta existe
if (!fs.existsSync(adImagesDir)) {
  fs.mkdirSync(adImagesDir, { recursive: true });
}

// Gerar um nome de arquivo único baseado na URL
const generateFilename = (url) => {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  
  // Determinar a extensão com base na URL
  let extension = '.jpg'; // Padrão
  if (url.includes('.png')) extension = '.png';
  else if (url.includes('.gif')) extension = '.gif';
  else if (url.includes('.webp')) extension = '.webp';
  
  return `${hash}${extension}`;
};

// Rota para servir como proxy para imagens de prévia de anúncios - sem autenticação
router.get('/ad-preview', async (req, res) => {
  try {
    let { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL da imagem não fornecida'
      });
    }
    
    // Corrigir problema de encapsulamento duplo ou múltiplo de URLs
    // Processa URL recursivamente enquanto encontrar nosso padrão de proxy
    let originalUrl = url;
    let iterations = 0;
    const maxIterations = 5; // Evitar loop infinito em caso de URL malformada
    
    while (originalUrl.includes('/api/images/ad-preview?url=') && iterations < maxIterations) {
      console.log(`Detectada URL com encapsulamento (iteração ${iterations + 1})`);
      try {
        const match = originalUrl.match(/\/api\/images\/ad-preview\?url=([^&]+)/);
        if (match && match[1]) {
          originalUrl = decodeURIComponent(match[1]);
          console.log('URL após extração:', originalUrl);
          iterations++;
        } else {
          break; // Não foi possível extrair mais
        }
      } catch (extractError) {
        console.error('Erro ao extrair URL de encapsulamento:', extractError.message);
        break;
      }
    }
    
    // Usar a URL original após extrair todos os encapsulamentos
    url = originalUrl;
    console.log('URL final após processamento:', url);
    
    // Se for uma URL de placeholder, redirecionar diretamente
    if (url.includes('placeholder.com') || url.includes('placekitten.com')) {
      return res.redirect(url);
    }
    
    // Gerar nome de arquivo baseado na URL
    const filename = generateFilename(url);
    const filePath = path.join(adImagesDir, filename);
    
    // Verificar se a imagem já foi baixada anteriormente
    if (fs.existsSync(filePath)) {
      console.log('Usando imagem em cache:', filename);
      // Redirecionar para a URL pública do arquivo
      return res.redirect(`/ad-images/${filename}`);
    }
    
    console.log('Baixando imagem da URL:', url);
    
    // Verificar se a URL é válida antes de fazer a requisição
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.error('URL inválida:', url);
      throw new Error('Invalid URL format');
    }

    // Fazer a requisição para a imagem com cabeçalhos apropriados
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      },
      // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
      timeout: 10000 // 10 segundos
    });
    
    // Salvar a imagem no sistema de arquivos
    fs.writeFileSync(filePath, response.data);
    console.log('Imagem salva em:', filePath);
    
    // Redirecionar para a URL pública do arquivo
    res.redirect(`/ad-images/${filename}`);
  } catch (error) {
    console.error('Erro ao processar imagem:', error.message);
    console.error('URL original:', req.query.url);
    
    // Log mais detalhado em caso de erro para ajudar no debugging
    if (error.code === 'ECONNABORTED') {
      console.error('Erro de timeout ao baixar a imagem');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Erro de DNS - host não encontrado');
    } else if (error.message.includes('Invalid URL')) {
      console.error('URL inválida, verificar formato');
    }
    
    // Redirecionar para uma imagem de placeholder em caso de erro
    res.redirect('https://via.placeholder.com/400x300?text=Imagem+não+disponível');
  }
});

module.exports = router;
