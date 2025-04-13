import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import apiCache from './apiCache';

// Criar uma instância do axios com configurações base
const axiosInstance = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configuração para debug de chamadas API
const DEBUG_API_CALLS = true;
const API_CALL_STACK_TRACE = true;

// Função para obter o componente atual
function getCurrentComponent(): string {
  if (!API_CALL_STACK_TRACE) return 'unknown';
  try {
    const stackLines = new Error().stack?.split('\n') || [];
    // Procurar por padrões comuns de componentes React
    const componentMatch = stackLines.find(line => 
      (line.includes('/src/pages/') || line.includes('/src/components/')) && 
      !line.includes('/node_modules/') && 
      !line.includes('/api.ts')
    );
    if (componentMatch) {
      // Extrair nome do componente e linha aproximada
      const parts = componentMatch.split('/');
      const fileNameWithLine = parts[parts.length - 1]?.split(':')[0] || 'unknown';
      return fileNameWithLine;
    }
  } catch (e) {
    // Ignorar erros ao tentar obter o stack trace
  }
  return 'unknown';
}

// Adicionar interceptor para incluir o token de autenticação
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Adicionar token de autenticação se disponível
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Identificar o componente que está fazendo a chamada
    const callerComponent = getCurrentComponent();
    const fullUrl = `${config.url}${config.params ? `?${new URLSearchParams(config.params).toString()}` : ''}`;
    
    // Log detalhado
    if (DEBUG_API_CALLS) {
      if (fullUrl.includes('/companies')) {
        console.log(`%c[API Request] ${config.method?.toUpperCase()} ${fullUrl}`, 'color: #1976d2; font-weight: bold');
        console.log(`%c[API Caller] Component: ${callerComponent}`, 'color: #1976d2');
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Interceptor para tratar erros de resposta
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Se receber erro de autenticação, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * API aprimorada com sistema de cache e throttling
 */
const api = {
  /**
   * Realiza uma requisição GET com cache
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig, forceRefresh = false): Promise<AxiosResponse<T>> {
    const cacheKey = `GET_${url}`;
    const callerComponent = getCurrentComponent();
    
    // Atualizar informações de diagnóstico para rastrear chamadas
    apiCache.updateDiagnostics(cacheKey, callerComponent);
    
    // Se está forçando a atualização, invalida o cache
    if (forceRefresh) {
      apiCache.invalidate(cacheKey);
    }
    
    // Verifica se há um resultado válido em cache
    if (apiCache.hasValidCache(cacheKey)) {
      if (DEBUG_API_CALLS && url.includes('/companies')) {
        console.log(`%c[API Cache] Usando cache para: ${url} (de ${callerComponent})`, 'color: #388e3c');
      }
      return apiCache.get(cacheKey) as AxiosResponse<T>;
    }
    
    // Verifica se já existe uma requisição pendente para a mesma URL
    if (apiCache.hasPendingRequest(cacheKey)) {
      if (DEBUG_API_CALLS && url.includes('/companies')) {
        console.log(`%c[API Throttle] Reutilizando requisição pendente para: ${url} (de ${callerComponent})`, 'color: #ff9800');
      }
      return apiCache.getPendingRequest(cacheKey) as Promise<AxiosResponse<T>>;
    }
    
    // Cria uma nova requisição
    if (DEBUG_API_CALLS && url.includes('/companies')) {
      console.log(`%c[API] Fazendo requisição para: ${url} (de ${callerComponent})`, 'color: #1976d2');
    }
    
    const requestPromise = axiosInstance.get<T>(url, config)
      .then((response: AxiosResponse<T>) => {
        // Guarda o resultado no cache com informação da fonte
        apiCache.set(cacheKey, response, callerComponent);
        // Remove da lista de requisições pendentes
        apiCache.clearPendingRequest(cacheKey);
        return response;
      })
      .catch((error: AxiosError) => {
        // Remove da lista de requisições pendentes em caso de erro
        apiCache.clearPendingRequest(cacheKey);
        throw error;
      });
    
    // Registra como uma requisição pendente com informação da fonte
    apiCache.setPendingRequest(cacheKey, requestPromise, callerComponent);
    
    return requestPromise;
  },
  
  /**
   * Realiza uma requisição POST (sempre sem cache)
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Invalida cache relacionado
    this.invalidateRelatedCache(url);
    return axiosInstance.post<T>(url, data, config);
  },
  
  /**
   * Realiza uma requisição PUT (sempre sem cache)
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Invalida cache relacionado
    this.invalidateRelatedCache(url);
    return axiosInstance.put<T>(url, data, config);
  },
  
  /**
   * Realiza uma requisição DELETE (sempre sem cache)
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Invalida cache relacionado
    this.invalidateRelatedCache(url);
    return axiosInstance.delete<T>(url, config);
  },
  
  /**
   * Invalida o cache relacionado a um endpoint
   */
  invalidateRelatedCache(url: string): void {
    // Extrai a parte principal da URL (sem parâmetros ou IDs específicos)
    const urlParts = url.split('/');
    const baseEndpoint = urlParts[1] || ''; // por exemplo: 'companies' de '/companies/123'
    
    // Invalida todos os caches que começam com este endpoint
    const cacheKey = `GET_/${baseEndpoint}`;
    console.log(`[API Cache] Invalidando cache relacionado a: ${baseEndpoint}`);
    apiCache.invalidate(cacheKey);
  },
  
  /**
   * Invalida todo o cache
   */
  invalidateAllCache(): void {
    apiCache.invalidateAll();
  }
};

export default api;
