const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const fs = require('fs');
require('dotenv').config();
const path = require('path');

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const sharedLinkRoutes = require('./routes/sharedLinkRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adRoutes = require('./routes/adRoutes');
const imageProxyRoutes = require('./routes/imageProxyRoutes');

// Conectar ao banco de dados
connectDB();

// Inicializar o app Express
const app = express();

// Middleware para Body Parser
app.use(express.json());

// Middleware para cookies
app.use(cookieParser());

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false // Desabilitar CSP para permitir download de PDFs
}));

// Configuração para servir arquivos estáticos
// Os arquivos em /public/reports serão acessíveis como /reports/arquivo.pdf
app.use('/reports', express.static(path.join(__dirname, 'public/reports'), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Configuração para servir imagens de anúncios como arquivos estáticos
app.use('/ad-images', express.static(path.join(__dirname, 'public/ad-images'), {
  setHeaders: (res, filePath) => {
    // Definir headers apropriados para imagens
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    }
    
    // Headers para cache e CORS
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 1 dia
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Criar diretórios necessários se não existirem
const publicReportsDir = path.join(__dirname, 'public/reports');
if (!fs.existsSync(publicReportsDir)) {
  fs.mkdirSync(publicReportsDir, { recursive: true });
}

// Garantir que o diretório temp/charts exista para geração de gráficos
const tempChartsDir = path.join(__dirname, 'temp/charts');
if (!fs.existsSync(tempChartsDir)) {
  fs.mkdirSync(tempChartsDir, { recursive: true });
}

// Garantir que o diretório temp/reports exista para geração de relatórios
const tempReportsDir = path.join(__dirname, 'temp/reports');
if (!fs.existsSync(tempReportsDir)) {
  fs.mkdirSync(tempReportsDir, { recursive: true });
}

// Configuração CORS mais permissiva
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Middleware adicional para CORS específico para imagens
app.use((req, res, next) => {
  if (req.path.includes('/api/images')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Timing-Allow-Origin', '*');
  }
  next();
});

// Logging de desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware para tratamento de erros personalizado
const errorHandler = (err, req, res, next) => {
  // Log para debug
  console.error(err.stack);

  // Formato de resposta de erro
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Erro no servidor'
  });
};

// Definir rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shared-links', sharedLinkRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/images', imageProxyRoutes);

// Rotas públicas (não requerem autenticação)
app.use('/api/public', publicRoutes);

// Rota básica para teste da API
app.get('/', (req, res) => {
  res.json({ message: 'API do Meta Ads Dashboard está funcionando!' });
});

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  const error = new Error(`Rota não encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Definir porta e iniciar o servidor
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em modo ${process.env.NODE_ENV} na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err, promise) => {
  console.log(`Erro: ${err.message}`);
  // Fechar servidor e sair do processo
  server.close(() => process.exit(1));
});

module.exports = server;
