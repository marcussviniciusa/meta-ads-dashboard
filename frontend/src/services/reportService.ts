import api from './api';

export interface GenerateReportParams {
  startDate: string;
  endDate: string;
  reportName?: string;
  selectedMetrics?: string[];
  selectedCharts?: string[];
  includeGraphics?: boolean;
  theme?: 'default' | 'modern' | 'minimal';
}

export interface ReportData {
  reportId: string;
  reportName: string;
  reportUrl: string;
  expiresAt: string;
}

export const reportService = {
  /**
   * Gera um relatório PDF com as métricas do período especificado
   * @param companyId ID da empresa
   * @param adAccountId ID da conta de anúncios
   * @param params Parâmetros do relatório
   * @returns Informações do relatório gerado, incluindo link compartilhável
   */
  async generateReport(companyId: string, adAccountId: string, params: GenerateReportParams) {
    const response = await api.post(`/api/reports/generate/${companyId}/${adAccountId}`, params);
    return response.data;
  },

  /**
   * Retorna o URL completo para download do relatório
   * @param reportUrl URL relativa do relatório
   * @returns URL completa para download
   */
  getReportDownloadUrl(reportUrl: string): string {
    // Se a URL já estiver completa, retorna ela mesma
    if (reportUrl.startsWith('http')) {
      return reportUrl;
    }
    
    // Obter o host base da aplicação
    const baseUrl = (import.meta as any).env.VITE_API_URL || window.location.origin;
    
    // Limpar a URL (remover a barra inicial se existir)
    const cleanUrl = reportUrl.startsWith('/') ? reportUrl.substring(1) : reportUrl;
    
    // Verificar se é uma URL para arquivo PDF (formato /reports/file.pdf)
    if (cleanUrl.includes('reports/') && cleanUrl.endsWith('.pdf')) {
      // Caminho direto para o arquivo estático
      return `${baseUrl}/${cleanUrl}`;
    }
    
    // Para outros casos (endpoints da API), adicionar prefixo /api/ se necessário
    if (!cleanUrl.startsWith('api/')) {
      return `${baseUrl}/api/${cleanUrl}`;
    }
    
    return `${baseUrl}/${cleanUrl}`;
  }
};
