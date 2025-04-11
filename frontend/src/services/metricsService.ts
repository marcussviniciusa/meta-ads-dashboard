import api from './api';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface MetricsFilter extends DateRange {
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  objectId?: string;
  forceRefresh?: boolean;
}

interface MetricsResponse {
  success: boolean;
  count: number;
  data: MetricsData[];
  source?: 'api' | 'database';
}

interface MetricsData {
  _id: string;
  company: string;
  adAccountId: string;
  date: string;
  level: 'account' | 'campaign' | 'adset' | 'ad';
  objectId: string;
  objectName?: string;
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    cpc: number;
    cpm: number;
    ctr: number;
    reach: number;
    frequency: number;
    unique_clicks: number;
    unique_ctr: number;
    cost_per_unique_click: number;
    conversions: number;
    cost_per_conversion: number;
    conversion_rate: number;
  };
  additionalMetrics?: Record<string, any>;
  syncInfo: {
    syncedAt: string;
    syncStatus: 'success' | 'partial' | 'failed';
    syncMessage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const metricsService = {
  async getMetrics(
    companyId: string,
    adAccountId: string,
    filters: MetricsFilter
  ): Promise<MetricsResponse> {
    const { startDate, endDate, level, objectId, forceRefresh } = filters;
    
    // Construir a query string
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    
    if (level) params.append('level', level);
    if (objectId) params.append('objectId', objectId);
    if (forceRefresh) params.append('forceRefresh', String(forceRefresh));
    
    const response = await api.get<MetricsResponse>(
      `/metrics/${companyId}/${adAccountId}?${params.toString()}`
    );
    
    return response.data;
  },
  
  async syncCompanyMetrics(
    companyId: string,
    days: number = 30
  ): Promise<any> {
    const response = await api.post(`/metrics/sync/${companyId}`, { days });
    return response.data;
  },
  
  // Função auxiliar para obter métricas agregadas por período
  aggregateMetricsByPeriod(
    metrics: MetricsData[],
    period: 'day' | 'week' | 'month' = 'day'
  ): any[] {
    if (!metrics || metrics.length === 0) return [];
    
    // Implementação básica, apenas para o caso 'day'
    // Uma implementação completa exigiria agrupamento por semana/mês
    if (period === 'day') {
      return metrics.map(metric => ({
        date: new Date(metric.date).toISOString().split('T')[0],
        ...metric.metrics
      }));
    }
    
    // Para semana e mês, precisaria de uma lógica mais complexa de agrupamento
    return [];
  },
  
  // Função auxiliar para calcular métricas totais
  calculateTotalMetrics(metrics: MetricsData[]): any {
    if (!metrics || metrics.length === 0) {
      return {
        impressions: 0,
        clicks: 0,
        spend: 0,
        cpc: 0,
        cpm: 0,
        ctr: 0,
        reach: 0,
        conversions: 0
      };
    }
    
    // Inicializar objeto de totais
    const totals: any = {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0
    };
    
    // Somar métricas
    metrics.forEach(metric => {
      totals.impressions += metric.metrics.impressions || 0;
      totals.clicks += metric.metrics.clicks || 0;
      totals.spend += metric.metrics.spend || 0;
      totals.reach += metric.metrics.reach || 0;
      totals.conversions += metric.metrics.conversions || 0;
    });
    
    // Calcular métricas derivadas
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;
    totals.cost_per_conversion = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    
    return totals;
  }
};

export default metricsService;
