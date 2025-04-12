# Estágio de build
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Definir a URL da API para o ambiente de produção
# Importante: não incluir /api aqui, o frontend já adiciona
ENV VITE_API_URL=https://api.speedfunnels.online

# Construir a aplicação para produção
RUN npm run build

# Estágio de produção
FROM nginx:alpine

# Configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos estáticos construídos
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
