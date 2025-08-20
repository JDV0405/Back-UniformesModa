const express = require('express');
const router = express.Router();
const SystemController = require('../controllers/system.controller');

/**
 * @swagger
 * /api/system/info:
 *   get:
 *     summary: Obtener información completa del sistema
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Información del sistema obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     version:
 *                       type: string
 *                     description:
 *                       type: string
 *                     node_version:
 *                       type: string
 *                     environment:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                     platform:
 *                       type: string
 *                     architecture:
 *                       type: string
 *                 message:
 *                   type: string
 */
router.get('/info', SystemController.getSystemInfo);

/**
 * @swagger
 * /api/system/version:
 *   get:
 *     summary: Obtener solo la versión del backend
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Versión obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 version:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 fallback:
 *                   type: boolean
 *                   description: Indica si se usó versión fallback
 */
router.get('/version', SystemController.getVersion);

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Health check del sistema
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Servicio funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Error en el servicio
 */
router.get('/health', SystemController.healthCheck);

module.exports = router;
