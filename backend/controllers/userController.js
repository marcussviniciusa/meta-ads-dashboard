const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Obter todos os usuários
// @route   GET /api/users
// @access  Private/SuperAdmin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find().populate('company', 'name');

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Obter um usuário específico
// @route   GET /api/users/:id
// @access  Private/SuperAdmin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('company', 'name');

  if (!user) {
    return next(new ErrorResponse(`Usuário não encontrado com id ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Criar um novo usuário
// @route   POST /api/users
// @access  Private/SuperAdmin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Atualizar um usuário
// @route   PUT /api/users/:id
// @access  Private/SuperAdmin
exports.updateUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`Usuário não encontrado com id ${req.params.id}`, 404));
  }

  // Impedir que a senha seja atualizada através deste endpoint
  if (req.body.password) {
    delete req.body.password;
  }

  user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Excluir um usuário
// @route   DELETE /api/users/:id
// @access  Private/SuperAdmin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`Usuário não encontrado com id ${req.params.id}`, 404));
  }

  // Impedir que um superadmin exclua a si mesmo
  if (req.user.id === req.params.id) {
    return next(new ErrorResponse('Você não pode excluir a si mesmo', 400));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Alterar senha do usuário
// @route   PUT /api/users/:id/password
// @access  Private/SuperAdmin
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new ErrorResponse('Por favor, forneça uma nova senha', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`Usuário não encontrado com id ${req.params.id}`, 404));
  }

  user.password = password;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      message: 'Senha alterada com sucesso'
    }
  });
});

// @desc    Atualizar status de ativação do usuário
// @route   PUT /api/users/:id/status
// @access  Private/SuperAdmin
exports.updateUserStatus = asyncHandler(async (req, res, next) => {
  const { isActive } = req.body;

  if (isActive === undefined) {
    return next(new ErrorResponse('Por favor, forneça o status de ativação', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`Usuário não encontrado com id ${req.params.id}`, 404));
  }

  // Impedir a desativação de um superadmin por si mesmo
  if (req.user.id === req.params.id && isActive === false) {
    return next(new ErrorResponse('Você não pode desativar a si mesmo', 400));
  }

  user.isActive = isActive;
  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});
