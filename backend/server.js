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

// Habilitar CORS
app.use(cors());

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
