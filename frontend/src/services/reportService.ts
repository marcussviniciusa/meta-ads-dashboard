import api from './api';

export interface GenerateReportParams {
  startDate: string;
  endDate: string;
  reportName?: string;
}

export interface ReportData {
  reportId: string;
  reportName: string;
  reportUrl: string;
  expiresAt: string;
}

export const reportService = {
  /**
   * Gera um relatu00f3rio PDF com as mu00e9tricas do peru00edodo especificado
   * @param companyId ID da empresa
   * @param adAccountId ID da conta de anu00fancios
   * @param params Paru00e2metros do relatu00f3rio
   * @returns Informau00e7u00f5es do relatu00f3rio gerado, incluindo link compartilhu00e1vel
   */
  async generateReport(companyId: string, adAccountId: string, params: GenerateReportParams) {
    const response = await api.post(`/reports/generate/${companyId}/${adAccountId}`, params);
    return response.data;
  },

  /**
   * Retorna o URL completo para download do relatu00f3rio
   * @param reportUrl URL relativa do relatu00f3rio
   * @returns URL completa para download
   */
  getReportDownloadUrl(reportUrl: string): string {
    // Remover a barra inicial se estiver presente
    const cleanUrl = reportUrl.startsWith('/') ? reportUrl.substring(1) : reportUrl;
    return `${import.meta.env.VITE_API_URL}/${cleanUrl}`;
  }
};
