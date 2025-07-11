# Imagen base oficial de Node.js
FROM node:22

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos necesarios para instalar dependencias
COPY package*.json ./
RUN npm install

# Copia el resto del código de la app
COPY . .

# Expón el puerto en el que corre tu backend
EXPOSE 3000

# Comando para ejecutar tu app
CMD ["node", "app.js"]
