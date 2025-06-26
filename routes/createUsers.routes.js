const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/createUsers.controller.js');

/**
 * @swagger
 * /api/usuarios:
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
 *               cedula:
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
 *               emailUsuario:
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

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Obtiene todos los usuarios del sistema
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   cedula:
 *                     type: string
 *                   nombre:
 *                     type: string
 *                   apellidos:
 *                     type: string
 *                   estado:
 *                     type: boolean
 *                   id_rol:
 *                     type: string
 *                   telefono:
 *                     type: string
 *                   email:
 *                     type: string
 *                   id_usuario:
 *                     type: integer
 *       500:
 *         description: Error interno del servidor
 */

router.get('/usuarios', usuarioController.obtenerTodosLosUsuarios);

/**
 * @swagger
 * /api/usuarios/{cedula}:
 *   put:
 *     summary: Edita un usuario existente
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del usuario a editar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *                 description: Nueva contraseña (opcional)
 *               emailUsuario:
 *                 type: string
 *               id_rol:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */

router.put('/usuarios/:cedula', usuarioController.editarUsuario);

module.exports = router;
