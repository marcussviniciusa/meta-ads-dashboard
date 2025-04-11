const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// @desc    Registrar um novo usuário
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Verificar se o usuário já existe
  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new ErrorResponse('Usuário já existe', 400));
  }

  // Criar usuário
  const user = await User.create({
    name,
    email,
    password
  });

  // Responder com o token
  sendTokenResponse(user, 201, res);
});

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validar email e senha
  if (!email || !password) {
    return next(new ErrorResponse('Por favor, forneça email e senha', 400));
  }

  // Verificar se o usuário existe
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Credenciais inválidas', 401));
  }

  // Verificar se a senha está correta
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Credenciais inválidas', 401));
  }

  // Atualizar data do último login
  user.lastLogin = Date.now();
  await user.save();

  // Responder com o token
  sendTokenResponse(user, 200, res);
});

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Logout / limpar cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Iniciar autenticação Meta
// @route   GET /api/auth/meta
// @access  Public
exports.metaAuth = asyncHandler(async (req, res, next) => {
  const redirectUrl = `https://www.facebook.com/${process.env.META_API_VERSION}/dialog/oauth?` +
    `client_id=${process.env.META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI)}` +
    `&scope=ads_read,ads_management`;

  res.status(200).json({
    success: true,
    redirectUrl
  });
});

// @desc    Callback de autenticação Meta
// @route   GET /api/auth/meta/callback
// @access  Public
exports.metaAuthCallback = asyncHandler(async (req, res, next) => {
  const { code } = req.query;

  if (!code) {
    return next(new ErrorResponse('Código de autorização não fornecido', 400));
  }

  // Este é um processo simplificado. Na implementação real, você trocaria o código
  // por um token de acesso usando a API do Meta e recuperaria informações do usuário
  res.redirect('/dashboard');
});

// Função auxiliar para enviar resposta com token JWT
const sendTokenResponse = (user, statusCode, res) => {
  // Criar token
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};
