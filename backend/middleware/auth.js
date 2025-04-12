const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('express-async-handler');

// Proteger rotas
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Obter token do header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    // Obter token dos cookies
    token = req.cookies.token;
  }

  // Verificar se o token existe
  if (!token) {
    return next(new ErrorResponse('Não autorizado para acessar esta rota', 401));
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adicionar usuário ao request
    req.user = await User.findById(decoded.id);
    
    next();
  } catch (err) {
    return next(new ErrorResponse('Não autorizado para acessar esta rota', 401));
  }
});

// Verificar permissões de usuário
const authorize = (...roles) => {
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

module.exports = {
  protect,
  authorize
};
