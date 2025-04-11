/**
 * apiCache.ts - Serviço para gerenciar cache e throttling de chamadas à API
 *
 * Este serviço implementa um mecanismo avançado para:
 * 1. Armazenar em cache as respostas da API por um período configurável
 * 2. Prevenir chamadas duplicadas à mesma endpoint durante um curto período
 * 3. Fornecer um mecanismo para forçar a atualização do cache quando necessário
 * 4. Rastrear e diagnosticar chamadas repetidas para ajudar a identificar problemas
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  source?: string; // Componente que originou a requisição
}

interface PendingRequest {
  timestamp: number;
  promise: Promise<any>;
  source?: string; // Componente que originou a requisição
}

interface DiagnosticsInfo {
  callCount: number;
  lastCalledBy: string;
  firstCalledAt: number;
  lastCalledAt: number;
  sources: Record<string, number>; // Fonte -> contagem de chamadas
}

class ApiCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private diagnostics: Map<string, DiagnosticsInfo> = new Map();
  private cacheDuration: number = 30000; // 30 segundos em milissegundos
  private throttleDuration: number = 500; // 500 milissegundos
  
  // Lista de requisições problemáticas (mais de 5 chamadas em 5 segundos)
  private problemRequests: Set<string> = new Set();

  /**
   * Verifica se há uma versão em cache válida para a chave fornecida
   */
  public hasValidCache(key: string): boolean {
    if (!this.cache.has(key)) return false;
    
    const item = this.cache.get(key)!;
    const now = Date.now();
    return now - item.timestamp < this.cacheDuration;
  }

  /**
   * Obtém dados do cache
   */
  public get<T>(key: string): T | null {
    if (!this.hasValidCache(key)) return null;
    return this.cache.get(key)!.data;
  }

  /**
   * Armazena dados no cache
   */
  public set<T>(key: string, data: T, source?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source
    });
  }

  /**
   * Limpa o cache para a chave fornecida
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  public invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Verifica se há uma requisição pendente para a chave fornecida
   */
  public hasPendingRequest(key: string): boolean {
    if (!this.pendingRequests.has(key)) return false;
    
    const request = this.pendingRequests.get(key)!;
    const now = Date.now();
    return now - request.timestamp < this.throttleDuration;
  }

  /**
   * Registra uma requisição pendente
   */
  public setPendingRequest(key: string, promise: Promise<any>, source?: string): Promise<any> {
    this.pendingRequests.set(key, {
      timestamp: Date.now(),
      promise,
      source
    });
    return promise;
  }

  /**
   * Obtém uma requisição pendente se existir
   */
  public getPendingRequest(key: string): Promise<any> | null {
    if (!this.hasPendingRequest(key)) return null;
    return this.pendingRequests.get(key)!.promise;
  }

  /**
   * Remove uma requisição pendente
   */
  public clearPendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }
  
  /**
   * Atualiza informações de diagnóstico para uma chave
   */
  public updateDiagnostics(key: string, source: string = 'unknown'): void {
    // Ativo apenas para endpoints importantes que queremos monitorar
    if (!key.includes('/companies') && !key.includes('/users')) {
      return;
    }
    
    const now = Date.now();
    if (!this.diagnostics.has(key)) {
      this.diagnostics.set(key, {
        callCount: 1,
        lastCalledBy: source,
        firstCalledAt: now,
        lastCalledAt: now,
        sources: { [source]: 1 }
      });
      return;
    }
    
    const info = this.diagnostics.get(key)!;
    info.callCount++;
    info.lastCalledBy = source;
    info.lastCalledAt = now;
    
    // Incrementa contagem por fonte
    if (info.sources[source]) {
      info.sources[source]++;
    } else {
      info.sources[source] = 1;
    }
    
    // Detecta chamadas excessivas - mais de 5 chamadas em 5 segundos
    const timeWindow = 5000; // 5 segundos
    if (info.callCount > 5 && (now - info.firstCalledAt) < timeWindow) {
      if (!this.problemRequests.has(key)) {
        this.problemRequests.add(key);
        console.warn(`%c[API Warning] Possível chamada excessiva detectada: ${key}`, 'color: #ff9800; font-weight: bold');
        console.warn(`Chamadas: ${info.callCount} em ${((now - info.firstCalledAt)/1000).toFixed(2)}s`);
        console.warn('Fontes das chamadas:', info.sources);
      }
    }
  }
  
  /**
   * Obtém informações de diagnóstico para uma chave
   */
  public getDiagnostics(key: string): DiagnosticsInfo | null {
    return this.diagnostics.get(key) || null;
  }
  
  /**
   * Lista todas as requisições problemáticas detectadas
   */
  public getProblemRequests(): string[] {
    return Array.from(this.problemRequests);
  }
}

// Exporta uma instância única para ser usada em toda a aplicação
export default new ApiCache();
