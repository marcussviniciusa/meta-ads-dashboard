const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Proteger rotas
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar se o token está no header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extrair token do Bearer token no header Authorization
    token = req.headers.authorization.split(' ')[1];
  }

  // Verificar se o token existe
  if (!token) {
    return next(new ErrorResponse('Não autorizado para acessar esta rota', 401));
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adicionar usuário ao req
    req.user = await User.findById(decoded.id);

    // Verificar se o usuário existe
    if (!req.user) {
      return next(new ErrorResponse('Usuário não encontrado', 404));
    }

    // Verificar se o usuário está ativo
    if (!req.user.isActive) {
      return next(new ErrorResponse('Este usuário está desativado', 401));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Não autorizado para acessar esta rota', 401));
  }
});

// Conceder acesso a roles específicas
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Usuário com papel ${req.user.role} não está autorizado a acessar esta rota`,
          403
        )
      );
    }
    next();
  };
};
