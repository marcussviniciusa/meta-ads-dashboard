FROM node:18-slim

WORKDIR /app

# Instalar dependências necessárias para compilação e execução do canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Instalar as dependências de produção
RUN npm install --omit=dev

# Copiar o restante dos arquivos da aplicação
COPY . .

# Criar a pasta para armazenar imagens baixadas de anúncios
RUN mkdir -p public/ad-images
RUN mkdir -p logs

# Porta que a aplicação irá expor
EXPOSE 5000

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
