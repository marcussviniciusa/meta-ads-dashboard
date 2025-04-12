#!/bin/bash

# Cores para saída no terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparando arquivos de deploy para o Meta Ads Dashboard...${NC}"

# Verifica se o build do backend foi realizado
if ! docker image inspect marcussviniciusa/speedfunnels-backend:v1 &> /dev/null; then
  echo -e "${RED}Imagem do backend não encontrada. Construindo...${NC}"
  cd backend
  docker build -t marcussviniciusa/speedfunnels-backend:v1 .
  cd ..
fi

# Verifica se o build do frontend foi realizado
if ! docker image inspect marcussviniciusa/speedfunnels-frontend:v1 &> /dev/null; then
  echo -e "${RED}Imagem do frontend não encontrada. Construindo...${NC}"
  cd frontend
  docker build -t marcussviniciusa/speedfunnels-frontend:v1 .
  cd ..
fi

# Cria diretório temporário para os arquivos de deploy
echo -e "${YELLOW}Criando diretório para arquivos de deploy...${NC}"
mkdir -p deploy_meta_ads_dashboard

# Copia os arquivos necessários
cp docker-compose.yml .env deploy_meta_ads_dashboard/
cp frontend/nginx.conf deploy_meta_ads_dashboard/

# Cria arquivo README com instruções
cat > deploy_meta_ads_dashboard/README.md << 'EOL'
# Meta Ads Dashboard - Instruções de Deploy

## Pré-requisitos
- Portainer configurado e acessível
- Traefik configurado como proxy reverso
- Rede Docker "SpeedFunnelsNet" criada

## Como fazer o deploy

1. **Faça upload do arquivo docker-compose.yml no Portainer**
   - Acesse "Stacks" no Portainer
   - Clique em "Add stack"
   - Nomeie o stack como "meta-ads-dashboard"
   - Faça upload do arquivo docker-compose.yml
   - Configure as variáveis de ambiente conforme .env

2. **Configure seus domínios**
   - Frontend: app.speedfunnels.online
   - Backend: api.speedfunnels.online

3. **Deploy e monitore**
   - Após o deploy, verifique os logs para garantir que tudo está funcionando
   - Testar acesso ao frontend e backend

## Solução de problemas comuns
- Se houver erros de CORS, verifique se o Traefik está configurado corretamente
- Para problemas com imagens, verifique o volume meta_ads_images
EOL

# Cria o arquivo zip para deploy
echo -e "${YELLOW}Criando arquivo ZIP para deploy...${NC}"
cd deploy_meta_ads_dashboard
zip -r ../meta_ads_dashboard_deploy.zip *
cd ..

# Remove diretório temporário
rm -rf deploy_meta_ads_dashboard

echo -e "${GREEN}✅ Deploy preparado com sucesso!${NC}"
echo -e "${GREEN}Arquivos de deploy salvos em: meta_ads_dashboard_deploy.zip${NC}"
echo -e "${YELLOW}Instruções de uso:${NC}"
echo -e "1. Faça upload das imagens Docker: marcussviniciusa/speedfunnels-backend:v1 e marcussviniciusa/speedfunnels-frontend:v1"
echo -e "2. Envie o arquivo meta_ads_dashboard_deploy.zip para o servidor"
echo -e "3. Use o Portainer para criar um novo stack com os arquivos contidos no ZIP"
