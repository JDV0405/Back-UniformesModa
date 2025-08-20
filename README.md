# 👔 Uniformes Moda - Backend API

Sistema backend para la gestión integral de uniformes empresariales, desarrollado con **Node.js** y **Express.js**.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#️-tecnologías)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#️-configuración)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Base de Datos](#️-base-de-datos)
- [Almacenamiento](#-almacenamiento)
- [Docker](#-docker)
- [Contribución](#-contribución)

## ✨ Características

- 🔐 **Autenticación y autorización** con JWT
- 👥 **Gestión de usuarios** (clientes y confeccionistas)
- 📦 **Gestión de pedidos** completa
- 🏭 **Control de producción** y seguimiento
- 📊 **Sistema de valoraciones** y assessment
- 🖼️ **Manejo de imágenes** con Azure Blob Storage
- 📱 **APIs públicas** para integración
- 📚 **Documentación Swagger** automática
- 🚀 **Rate limiting** y compresión
- 🐳 **Containerización** con Docker

## 🛠️ Tecnologías

### Core
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos principal

### Dependencias Principales
- **bcrypt** - Encriptación de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **multer** - Manejo de archivos
- **cors** - Cross-Origin Resource Sharing
- **compression** - Compresión de respuestas
- **express-rate-limit** - Limitación de tasa

### Azure & Storage
- **@azure/storage-blob** - Almacenamiento en la nube
- **node-cache** - Cache en memoria

### Documentación
- **swagger-jsdoc** - Generación de documentación
- **swagger-ui-express** - Interfaz de documentación

## 🏗️ Arquitectura

El proyecto sigue una arquitectura **MVC (Model-View-Controller)** con separación clara de responsabilidades:

```
backend/
├── 📁 config/           # Configuraciones (Azure, DB)
├── 📁 controllers/      # Lógica de negocio
├── 📁 database/         # Conexión a base de datos
├── 📁 middlewares/      # Middlewares personalizados
├── 📁 models/           # Modelos de datos
├── 📁 routes/           # Definición de rutas
├── 📁 sql/              # Scripts SQL e datos iniciales
├── 🐳 Dockerfile        # Configuración de Docker
├── 📱 app.js            # Punto de entrada
└── 📖 swagger.js        # Configuración de documentación
```

### Módulos Principales

| Módulo | Descripción |
|--------|-------------|
| **Users** | Gestión de usuarios y autenticación |
| **Orders** | Manejo de pedidos y órdenes |
| **Production** | Control de producción y avances |
| **Products** | Catálogo de productos y atributos |
| **Assessment** | Sistema de valoraciones |
| **Manufacturer** | Gestión de confeccionistas |
| **Elements** | Creación de elementos del sistema |
| **Public APIs** | APIs de acceso público |
| **System** | Configuraciones del sistema |

## 🚀 Instalación

### Prerrequisitos
- **Node.js** (v18 o superior)
- **PostgreSQL** (v13 o superior)
- **Azure Storage Account** (opcional, para producción)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/Davidsvr04/Back-UniformesModa.git
cd Back-UniformesModa
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Inicializar base de datos**
```bash
# Ejecutar script SQL de inicialización
psql -U usuario -d database -f sql/init.sql
```

5. **Iniciar el servidor**
```bash
npm start
```

## ⚙️ Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uniformes_moda
DB_USER=tu_usuario
DB_PASS=tu_password

# JWT
JWT_SECRET=tu_clave_secreta_super_segura

# Azure Storage (Opcional)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=uniformes-images

# Servidor
PORT=3000
NODE_ENV=development
```

### Base de Datos

El sistema utiliza **PostgreSQL** con las siguientes características:
- ✅ Conexión SSL para Azure
- ✅ Pool de conexiones
- ✅ Scripts de inicialización incluidos
- ✅ Datos de municipios y colores precargados

## 📖 Uso

### Iniciar el Servidor

```bash
# Desarrollo
npm start

# Con nodemon (recomendado para desarrollo)
npx nodemon app.js
```

### Acceder a la Documentación

Una vez iniciado el servidor, la documentación Swagger estará disponible en:
```
http://localhost:3000/api-docs
```

### Endpoints de Prueba

```bash
# Verificar estado del servidor
GET http://localhost:3000/

# Probar conexión a Azure Storage
GET http://localhost:3000/test-azure-storage
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/register` - Registro de usuarios
- `POST /api/login` - Inicio de sesión
- `POST /api/logout` - Cerrar sesión

### Gestión de Usuarios
- `GET /api/users` - Listar usuarios
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Pedidos
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Crear pedido
- `PUT /api/orders/:id` - Actualizar pedido
- `GET /api/orderManagement` - Gestión de pedidos

### Productos
- `GET /api/products` - Listar productos
- `GET /api/attributes` - Obtener atributos
- `POST /api/elements` - Crear elementos

### Producción
- `GET /api/production/orders` - Órdenes de producción
- `POST /api/production/advance` - Avanzar producción

### Sistema
- `GET /api/system/config` - Configuración del sistema
- `POST /api/system/backup` - Respaldo del sistema

> 📚 **Documentación completa disponible en** `/api-docs`

## 🗄️ Base de Datos

### Esquema Principal

```sql
-- Usuarios
users (id, name, email, password, role, created_at)

-- Pedidos
orders (id, user_id, status, total, created_at)

-- Productos
products (id, name, description, price, category_id)

-- Producción
production_orders (id, order_id, status, assigned_to)
```

### Datos Iniciales

El sistema incluye datos precargados:
- **Municipios** (Colombia) - `municipios_utf8.csv`
- **Colores** disponibles - `colores.csv`

## 📁 Almacenamiento

### Manejo de Archivos

El sistema implementa un **fallback inteligente**:

1. **Azure Blob Storage** (Producción)
   - Almacenamiento escalable en la nube
   - URLs públicas para acceso directo
   - Organización por carpetas

2. **Sistema Local** (Desarrollo/Fallback)
   - Almacenamiento en disco local
   - Estructura de carpetas organizada
   - Respaldo automático

### Tipos de Archivos Soportados

- 🖼️ **Imágenes de productos**
- 📄 **Facturas PDF**
- 📋 **Comprobantes de pago**
- 📊 **Reportes del sistema**

## 🐳 Docker

### Construcción de la Imagen

```bash
# Construir imagen
docker build -t uniformes-moda-backend .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env uniformes-moda-backend
```

### Características del Dockerfile

- ✅ **Imagen Alpine** (lightweight ~150MB)
- ✅ **Usuario no-root** para seguridad
- ✅ **Optimización de capas**
- ✅ **Cache de npm** eficiente

### Docker Compose (Recomendado)

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: uniformes_moda
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🛡️ Seguridad

### Medidas Implementadas

- 🔒 **Encriptación** de contraseñas con bcrypt
- 🎫 **JWT** para autenticación stateless
- 🚦 **Rate limiting** para prevenir spam
- 🌐 **CORS** configurado correctamente
- 🔧 **Headers de seguridad**
- 📊 **Validación** de entrada de datos

### Middlewares de Seguridad

- `auth.middleware.js` - Verificación de tokens
- `rateLimiting.middleware.js` - Limitación de peticiones
- `compression.middleware.js` - Compresión de respuestas

## 📊 Monitoreo

### Logs del Sistema

```bash
# Ver logs en tiempo real
docker logs -f uniformes-moda-backend

# Logs específicos
npm start | grep "ERROR"
```

### Health Checks

- ✅ Conexión a base de datos
- ✅ Estado de Azure Storage
- ✅ Tiempo de respuesta de APIs

## 🚦 Estados del Proyecto

| Característica | Estado | Versión |
|---------------|--------|---------|
| API Core | ✅ Completo | v1.0.3 |
| Autenticación | ✅ Completo | v1.0.0 |
| Documentación | ✅ Completo | v1.0.0 |
| Docker | ✅ Completo | v1.0.0 |
| Tests | ⏳ Pendiente | - |

## 🤝 Contribución

### Proceso de Desarrollo

1. **Fork** del repositorio
2. **Crear** rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear** Pull Request

### Estándares de Código

- ✅ **ESLint** para linting
- ✅ **Prettier** para formato
- ✅ **Conventional Commits**
- ✅ **JSDoc** para documentación

## 📞 Soporte

### Equipo de Desarrollo
- **Uniformes Moda Team**
- **Repository**: [Back-UniformesModa](https://github.com/Davidsvr04/Back-UniformesModa)
- **Branch Principal**: `dev`

### Reportar Issues

Para reportar bugs o solicitar funcionalidades, crear un issue en GitHub con:
- 📝 Descripción detallada
- 🔄 Pasos para reproducir
- 🖥️ Información del entorno
- 📸 Screenshots (si aplica)

---

## 📄 Licencia

Este proyecto está bajo la Licencia **ISC**.

---

<div align="center">

**Hecho con ❤️ por David Viloria y Victor Manuel Desarrolladores FullStack**

[🔗 Repositorio](https://github.com/Davidsvr04/Back-UniformesModa) • [📚 Documentación](http://localhost:3000/api-docs) • [🐛 Issues](https://github.com/Davidsvr04/Back-UniformesModa/issues)

</div>