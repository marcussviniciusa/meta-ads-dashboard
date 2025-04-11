/**
 * Middleware para lidar com exceções assíncronas nas rotas
 * Elimina a necessidade de usar try-catch em cada controlador
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
