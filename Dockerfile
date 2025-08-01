# Imagen base oficial de Node.js
FROM node:22

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos necesarios para instalar dependencias
COPY package*.json ./
RUN npm install

# Copia el resto del código de la app
COPY . .

# Variables de entorno por defecto (pueden ser sobrescritas en el deployment)
ENV NODE_ENV=production
ENV PORT=3000

# Expón el puerto en el que corre tu backend
EXPOSE 3000

# Comando para ejecutar tu app
CMD ["node", "app.js"]
