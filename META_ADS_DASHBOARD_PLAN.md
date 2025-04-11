# Meta Ads Analytics Dashboard - Plano de Desenvolvimento

## Visão Geral
Sistema web para análise de métricas do Meta Ads, onde o usuário conecta sua conta de anúncios através de token e ID da conta, visualizando as métricas em um dashboard completo, com a possibilidade de exportar relatórios em PDF.

## Hierarquia do Sistema
- **Superadmin**: Pode criar e editar empresas e usuários
- **Usuário**: Utiliza o sistema para análise de métricas

## Requisitos Funcionais

### Autenticação e Usuários
- [ ] Sistema de login e autenticação
- [ ] Gerenciamento de usuários (CRUD)
- [ ] Hierarquia de permissões (superadmin e usuário)
- [ ] Gerenciamento de empresas (CRUD)

### Integração com Meta Ads
- [ ] Conexão com a API de Marketing do Meta
- [ ] Autenticação OAuth com a plataforma Meta
- [ ] Armazenamento seguro de tokens de acesso
- [ ] Sistema de revalidação de tokens expirados

### Dashboard e Visualização
- [ ] Dashboard principal com métricas-chave
- [ ] Gráficos de desempenho e tendências
- [ ] Indicadores de performance (KPIs)
- [ ] **Filtragem por data** (período personalizado, predefinidos, etc.)
- [ ] Filtragem por campanha, conjunto de anúncios e anúncios
- [ ] Visualização de métricas em tempo real

### Sincronização de Dados
- [ ] Mecanismo de pull para atualização periódica de dados
- [ ] Indicador de "última atualização" de dados
- [ ] Sistema de cache para otimização de requisições
- [ ] Tratamento de limitações de taxa da API
- [ ] Sistema de filas para processamento de requisições volumosas
- [ ] Log de sincronização e auditoria

### Relatórios em PDF
- [ ] Geração de relatórios em PDF
- [ ] Personalização de relatórios
- [ ] Agendamento de relatórios periódicos
- [ ] Histórico de relatórios gerados

## Fases de Desenvolvimento

### Fase 1: Configuração e Autenticação
- [ ] Configuração do ambiente de desenvolvimento
- [ ] Estruturação do banco de dados
- [ ] Implementação do sistema de autenticação
- [ ] Desenvolvimento do CRUD de usuários
- [ ] Desenvolvimento do CRUD de empresas
- [ ] Configuração do aplicativo na plataforma Meta for Developers
- [ ] Implementação do fluxo de autenticação OAuth

### Fase 2: Sincronização de Dados
- [ ] Desenvolvimento de endpoints para consulta à API de Insights
- [ ] Implementação de sistema de agendamento para atualização periódica
- [ ] Desenvolvimento de mecanismo de cache
- [ ] Implementação de sistema de flags para verificação de sincronização
- [ ] Desenvolvimento de indicadores de status de sincronização
- [ ] Implementação de sistema de rate limiting
- [ ] Desenvolvimento de mecanismo de retry para falhas
- [ ] Implementação de sistema de logs para auditoria

### Fase 3: Dashboard e Visualização
- [ ] Desenvolvimento da interface do dashboard
- [ ] Implementação de gráficos e visualizações
- [ ] Desenvolvimento do sistema de filtragem por data
- [ ] Implementação de filtros por campanha, conjunto de anúncios, etc.
- [ ] Desenvolvimento de indicadores de performance (KPIs)
- [ ] Implementação de visualização em tempo real
- [ ] Testes de usabilidade e ajustes de interface

### Fase 4: Relatórios em PDF
- [ ] Desenvolvimento de engine para geração de PDFs
- [ ] Implementação de templates de relatórios
- [ ] Desenvolvimento de funcionalidade de personalização
- [ ] Implementação de sistema de agendamento
- [ ] Desenvolvimento de histórico de relatórios
- [ ] Testes de geração e validação de PDFs

## Detalhamento Técnico

### Integração com Meta Ads API

#### Autenticação
```javascript
// Exemplo de fluxo de autenticação OAuth
const metaAuthConfig = {
  clientId: process.env.META_CLIENT_ID,
  clientSecret: process.env.META_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/auth/meta/callback`,
  scopes: ['ads_read', 'ads_management']
};

// URL de autorização
const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${metaAuthConfig.clientId}&redirect_uri=${metaAuthConfig.redirectUri}&scope=${metaAuthConfig.scopes.join(',')}`;
```

#### Consulta de Métricas
```javascript
// Exemplo de consulta à API de Insights
async function getAdAccountInsights(accountId, accessToken, dateRange) {
  const url = `https://graph.facebook.com/v22.0/act_${accountId}/insights`;
  const params = new URLSearchParams({
    fields: 'impressions,clicks,spend,cpc,ctr,reach,frequency',
    time_range: JSON.stringify(dateRange),
    access_token: accessToken
  });

  const response = await fetch(`${url}?${params}`);
  return await response.json();
}
```

#### Sistema de Sincronização
```javascript
// Exemplo de agendamento de sincronização
const syncScheduler = new CronJob('*/15 * * * *', async function() {
  // Executar a cada 15 minutos
  const accounts = await getActiveAccounts();
  for (const account of accounts) {
    await syncQueue.add('syncMetrics', {
      accountId: account.id,
      accessToken: account.accessToken
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  }
});

syncScheduler.start();
```

### Filtragem por Data
```javascript
// Exemplo de implementação de filtro de data
const dateRangeOptions = [
  { label: 'Hoje', value: 'today', 
    range: () => ({ since: moment().format('YYYY-MM-DD'), until: moment().format('YYYY-MM-DD') }) },
  { label: 'Ontem', value: 'yesterday', 
    range: () => ({ since: moment().subtract(1, 'days').format('YYYY-MM-DD'), until: moment().subtract(1, 'days').format('YYYY-MM-DD') }) },
  { label: 'Últimos 7 dias', value: 'last_7d', 
    range: () => ({ since: moment().subtract(7, 'days').format('YYYY-MM-DD'), until: moment().format('YYYY-MM-DD') }) },
  { label: 'Últimos 30 dias', value: 'last_30d', 
    range: () => ({ since: moment().subtract(30, 'days').format('YYYY-MM-DD'), until: moment().format('YYYY-MM-DD') }) },
  { label: 'Este mês', value: 'this_month', 
    range: () => ({ since: moment().startOf('month').format('YYYY-MM-DD'), until: moment().format('YYYY-MM-DD') }) },
  { label: 'Mês passado', value: 'last_month', 
    range: () => ({ since: moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD'), 
                    until: moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD') }) },
  { label: 'Personalizado', value: 'custom' }
];

// Implementação do componente de seleção de data no frontend
async function fetchMetricsWithDateFilter(accountId, dateRange) {
  // Validar intervalo de datas
  if (new Date(dateRange.since) > new Date(dateRange.until)) {
    throw new Error('Data inicial deve ser anterior à data final');
  }
  
  // Buscar métricas com o filtro de data
  return await getAdAccountInsights(accountId, accessToken, dateRange);
}
```

## Tecnologias Sugeridas

### Backend
- Node.js com Express ou NestJS
- MongoDB ou PostgreSQL para banco de dados
- Redis para cache e filas
- Bull para gerenciamento de tarefas assíncronas
- Passport.js para autenticação
- PDFKit ou Puppeteer para geração de PDFs

### Frontend
- React.js ou Vue.js
- Material-UI ou Tailwind CSS para interface
- Chart.js ou D3.js para visualizações
- React Query para gerenciamento de estado
- Formik ou React Hook Form para formulários

## Status do Projeto

**Data de início:** 11/04/2025
**Status atual:** Em planejamento

---

*Este documento será atualizado conforme o desenvolvimento avançar.*
