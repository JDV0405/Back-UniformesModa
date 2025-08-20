const fs = require('fs');
const path = require('path');

class SystemController {
    // Obtener información del sistema incluyendo la versión
    static async getSystemInfo(req, res) {
        try {
            // Leer el package.json para obtener la versión
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            const systemInfo = {
                success: true,
                data: {
                    name: packageData.name || 'Uniformes Moda Backend',
                    version: packageData.version || '1.0.0',
                    description: packageData.description || 'Backend para el sistema de Uniformes Moda',
                    node_version: process.version,
                    environment: process.env.NODE_ENV || 'development',
                    uptime: Math.floor(process.uptime()),
                    timestamp: new Date().toISOString(),
                    platform: process.platform,
                    architecture: process.arch
                },
                message: "Información del sistema obtenida exitosamente"
            };
            
            res.status(200).json(systemInfo);
            
        } catch (error) {
            console.error('Error al obtener información del sistema:', error);
            res.status(500).json({
                success: false,
                message: "Error al obtener información del sistema",
                error: error.message,
                data: {
                    version: "1.0.8", // Versión fallback hardcodeada
                    name: "Uniformes Moda Backend"
                }
            });
        }
    }

    // Endpoint simple solo para la versión (más rápido)
    static async getVersion(req, res) {
        try {
            // Leer el package.json para obtener solo la versión
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            res.status(200).json({
                success: true,
                version: packageData.version || '1.0.8',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error al obtener versión:', error);
            res.status(200).json({
                success: true,
                version: "1.0.8", // Versión fallback
                timestamp: new Date().toISOString(),
                fallback: true
            });
        }
    }

    // Health check endpoint
    static async healthCheck(req, res) {
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            res.status(200).json({
                success: true,
                status: 'healthy',
                version: packageData.version || '1.0.8',
                uptime: Math.floor(process.uptime()),
                timestamp: new Date().toISOString(),
                message: "Servicio funcionando correctamente"
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                status: 'unhealthy',
                version: "1.0.8",
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }
}

module.exports = SystemController;
