const { BlobServiceClient } = require('@azure/storage-blob');

// Configuración de Azure Blob Storage
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uniformes-images';

if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.warn('⚠️  AZURE_STORAGE_CONNECTION_STRING no está configurado. Usando almacenamiento local como fallback.');
}

let blobServiceClient = null;

try {
    if (AZURE_STORAGE_CONNECTION_STRING) {
        blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    }
} catch (error) {
    console.error('❌ Error al configurar Azure Blob Storage:', error.message);
}

/**
 * Subir un archivo a Azure Blob Storage
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} folder - Carpeta dentro del contenedor (comprobantes, productos, etc.)
 * @param {string} contentType - Tipo de contenido del archivo
 * @returns {Promise<string>} URL del archivo subido
 */
async function uploadToBlob(fileBuffer, fileName, folder = '', contentType = 'application/octet-stream') {
    if (!blobServiceClient) {
        throw new Error('Azure Blob Storage no está configurado correctamente');
    }

    try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Crear el contenedor si no existe
        await containerClient.createIfNotExists({
            access: 'blob' // Acceso público para lectura
        });

        // Crear la ruta completa del blob
        const blobName = folder ? `${folder}/${fileName}` : fileName;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Subir el archivo
        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: contentType
            }
        });

        return blockBlobClient.url;

    } catch (error) {
        console.error('❌ Error al subir archivo a Azure Blob:', error.message);
        throw new Error(`Error al subir archivo a Azure: ${error.message}`);
    }
}

/**
 * Eliminar un archivo de Azure Blob Storage
 * @param {string} blobUrl - URL completa del blob
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
async function deleteFromBlob(blobUrl) {
    if (!blobServiceClient) {
        console.warn('Azure Blob Storage no configurado, no se puede eliminar');
        return false;
    }

    try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Extraer el nombre del blob de la URL
        const url = new URL(blobUrl);
        const blobName = url.pathname.split('/').slice(2).join('/'); // Eliminar el container del path
        
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.deleteIfExists();

        return true;

    } catch (error) {
        console.error('❌ Error al eliminar archivo de Azure Blob:', error.message);
        return false;
    }
}

/**
 * Verificar si Azure Blob Storage está disponible
 * @returns {boolean} True si está configurado y disponible
 */
function isAzureBlobAvailable() {
    return blobServiceClient !== null;
}

/**
 * Guardar archivo con fallback a filesystem local
 * @param {Object} file - Objeto de archivo de multer
 * @param {string} folder - Carpeta de destino
 * @param {string} baseUrl - URL base para construir URLs locales
 * @returns {Promise<string>} URL del archivo guardado
 */
async function saveFileWithFallback(file, folder, baseUrl) {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const extension = require('path').extname(file.originalname);
    const fileName = `${folder}_${timestamp}_${randomSuffix}${extension}`;

    // Intentar guardar en Azure Blob primero
    if (isAzureBlobAvailable()) {
        try {
            const fileBuffer = file.buffer || require('fs').readFileSync(file.path);
            const contentType = file.mimetype || 'application/octet-stream';
            
            return await uploadToBlob(fileBuffer, fileName, folder, contentType);
        } catch (error) {
            console.warn('⚠️  Error con Azure Blob, usando fallback local:', error.message);
        }
    }

    // Fallback: usar almacenamiento local
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const uploadsDir = path.join(os.homedir(), 'Desktop', 'Uniformes_Imagenes', folder);
    
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, fileName);
    
    if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
        fs.copyFileSync(file.path, filePath);
    } else {
        throw new Error('El archivo no tiene buffer ni ruta válida');
    }
    
    return `${baseUrl}/${folder}/${fileName}`;
}

module.exports = {
    uploadToBlob,
    deleteFromBlob,
    isAzureBlobAvailable,
    saveFileWithFallback,
    CONTAINER_NAME
};
