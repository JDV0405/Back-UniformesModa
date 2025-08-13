# Usar imagen Alpine (mucho más liviana ~150MB vs ~1GB)
FROM node:22-alpine

# Instalar dependencias necesarias para bcrypt y otras librerías nativas
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar el código de la aplicación
COPY . .

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

CMD ["node", "app.js"]