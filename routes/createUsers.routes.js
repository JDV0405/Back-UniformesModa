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
 *               activo:
 *                 type: boolean
 *               telefono:
 *                 type: string
 *               contrasena:
 *                 type: string
 *               emailUsuario:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array de IDs de roles a asignar al empleado
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error al crear el usuario
 *       500:
 *         description: Error interno del servidor
 */

router.post('/createUsers', usuarioController.crearUsuario);

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
 *                   activo:
 *                     type: boolean
 *                   telefono:
 *                     type: string
 *                   email:
 *                     type: string
 *                   id_usuario:
 *                     type: integer
 *                   usuario_activo:
 *                     type: boolean
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id_rol:
 *                           type: integer
 *                         nombre_rol:
 *                           type: string
 *                         descripcion:
 *                           type: string
 *       500:
 *         description: Error interno del servidor
 */

router.get('/getAllUsers', usuarioController.obtenerTodosLosUsuarios);

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
 *               activo:
 *                 type: boolean
 *                 description: Estado activo del usuario. Si se establece en false, desactiva tanto el empleado como el usuario
 *               telefono:
 *                 type: string
 *               contrasena:
 *                 type: string
 *                 description: Nueva contraseña (opcional)
 *               emailUsuario:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array de IDs de roles a asignar al empleado
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

router.put('/editUsers/:cedula', usuarioController.editarUsuario);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Obtiene todos los roles disponibles
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de roles obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_rol:
 *                     type: integer
 *                   nombre_rol:
 *                     type: string
 *                   descripcion:
 *                     type: string
 *                   activo:
 *                     type: boolean
 *       500:
 *         description: Error interno del servidor
 */

router.get('/roles', usuarioController.obtenerTodosLosRoles);

module.exports = router;
