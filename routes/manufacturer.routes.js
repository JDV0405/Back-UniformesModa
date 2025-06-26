const express = require('express');
const router = express.Router();
const ConfeccionistaController = require('../controllers/manufacturer.controller.js');

/**
 * @swagger
 * /api/confeccionistas:
 *   get:
 *     summary: Obtiene todos los confeccionistas con estadísticas básicas
 *     tags: [Confeccionistas]
 *     responses:
 *       200:
 *         description: Lista de confeccionistas obtenida correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/', ConfeccionistaController.getAllConfeccionistas);

/**
 * @swagger
 * /api/confeccionistas/productos:
 *   get:
 *     summary: Obtiene todos los confeccionistas con resumen de sus productos
 *     tags: [Confeccionistas]
 *     responses:
 *       200:
 *         description: Datos obtenidos correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/productos', ConfeccionistaController.getAllConfeccionistasWithProducts);

/**
 * @swagger
 * /api/confeccionistas/{id}:
 *   get:
 *     summary: Obtiene un confeccionista específico por su ID
 *     tags: [Confeccionistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del confeccionista
 *     responses:
 *       200:
 *         description: Datos del confeccionista obtenidos correctamente
 *       404:
 *         description: Confeccionista no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', ConfeccionistaController.getConfeccionistaById);

/**
 * @swagger
 * /api/confeccionistas/{id}/productos:
 *   get:
 *     summary: Obtiene todos los productos asignados a un confeccionista específico
 *     tags: [Confeccionistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del confeccionista
 *     responses:
 *       200:
 *         description: Productos obtenidos correctamente
 *       404:
 *         description: Confeccionista no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/productos', ConfeccionistaController.getProductosByConfeccionista);

/**
 * @swagger
 * /api/confeccionistas:
 *   post:
 *     summary: Crea un nuevo confeccionista
 *     tags: [Confeccionistas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cedula
 *               - nombre
 *               - direccion
 *               - municipio
 *             properties:
 *               cedula:
 *                 type: integer
 *                 description: Número de cédula del confeccionista
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del confeccionista
 *               telefono:
 *                 type: integer
 *                 description: Número de teléfono del confeccionista
 *               direccion:
 *                 type: string
 *                 description: Dirección física del confeccionista
 *               municipio:
 *                 type: string
 *                 description: Municipio donde reside el confeccionista
 *     responses:
 *       201:
 *         description: Confeccionista creado correctamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Ya existe un confeccionista con esa cédula
 *       500:
 *         description: Error del servidor
 */
router.post('/', ConfeccionistaController.createConfeccionista);

/**
 * @swagger
 * /api/confeccionistas/{id}:
 *   put:
 *     summary: Actualiza un confeccionista existente
 *     tags: [Confeccionistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del confeccionista a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cedula:
 *                 type: integer
 *                 description: Número de cédula del confeccionista
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del confeccionista
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono del confeccionista
 *               direccion:
 *                 type: string
 *                 description: Dirección física del confeccionista
 *               municipio:
 *                 type: string
 *                 description: Municipio donde reside el confeccionista
 *               activo:
 *                 type: boolean
 *                 description: Indica si el confeccionista está activo
 *     responses:
 *       200:
 *         description: Confeccionista actualizado correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Confeccionista no encontrado
 *       409:
 *         description: Conflicto con datos existentes
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', ConfeccionistaController.updateConfeccionista);

/**
 * @swagger
 * /api/confeccionistas/{id}:
 *   delete:
 *     summary: Elimina un confeccionista o lo marca como inactivo si tiene productos asignados
 *     tags: [Confeccionistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del confeccionista a eliminar
 *     responses:
 *       200:
 *         description: Confeccionista eliminado o marcado como inactivo correctamente
 *       404:
 *         description: Confeccionista no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', ConfeccionistaController.deleteConfeccionista);

module.exports = router;