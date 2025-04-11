/**
 * Classe personalizada para tratamento de erros da API
 * Estende a classe Error nativa do JavaScript
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;
