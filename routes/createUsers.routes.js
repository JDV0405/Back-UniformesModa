const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/createUsers.controller.js');

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cedula_empleado:
 *                 type: string
 *               nombre:
 *                 type: string
 *               apellidos:
 *                 type: string
 *               estado:
 *                 type: boolean
 *               telefono:
 *                 type: string
 *               contrasena:
 *                 type: string
 *               email:
 *                 type: string
 *               id_rol:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error al crear el usuario
 *       500:
 *         description: Error interno del servidor
 */

router.post('/usuarios', usuarioController.crearUsuario);

module.exports = router;
