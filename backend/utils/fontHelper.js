/**
 * Utilitário para garantir o uso correto de fontes com negrito
 */

/**
 * Retorna uma fonte em negrito sem duplicar o sufixo -Bold
 * @param {string} fontName Nome da fonte
 * @returns {string} Nome da fonte com sufixo -Bold apenas uma vez
 */
function getBoldFont(fontName) {
  if (fontName.includes('-Bold')) {
    return fontName; // Já tem Bold no nome
  }
  return `${fontName}-Bold`;
}

module.exports = {
  getBoldFont
};
