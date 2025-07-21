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

/**
 * @swagger
 * /api/perfil/{cedula}:
 *   get:
 *     summary: Obtiene el perfil completo de un usuario
 *     tags: [Perfil de Usuario]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del usuario
 *     responses:
 *       200:
 *         description: Perfil del usuario obtenido exitosamente
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
 *                     informacion_personal:
 *                       type: object
 *                       properties:
 *                         cedula:
 *                           type: string
 *                         nombre:
 *                           type: string
 *                         apellidos:
 *                           type: string
 *                         empleado_activo:
 *                           type: boolean
 *                         telefono:
 *                           type: string
 *                         email:
 *                           type: string
 *                         usuario_activo:
 *                           type: boolean
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: object
 *                     estadisticas:
 *                       type: object
 *                       properties:
 *                         total_ordenes_gestionadas:
 *                           type: integer
 *                         ordenes_activas:
 *                           type: integer
 *                         total_productos_gestionados:
 *                           type: integer
 *                         cantidad_total_productos:
 *                           type: integer
 *                         procesos_participados:
 *                           type: integer
 *                         procesos_completados:
 *                           type: integer
 *                     ordenes_recientes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     procesos_recientes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     historial_actividades:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Cédula requerida
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/perfil/:cedula', usuarioController.obtenerPerfilUsuario);

/**
 * @swagger
 * /api/estadisticas/{cedula}:
 *   get:
 *     summary: Obtiene las estadísticas de un usuario
 *     tags: [Perfil de Usuario]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del usuario
 *     responses:
 *       200:
 *         description: Estadísticas del usuario obtenidas exitosamente
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
 *                     total_ordenes_gestionadas:
 *                       type: integer
 *                     ordenes_activas:
 *                       type: integer
 *                     total_productos_gestionados:
 *                       type: integer
 *                     cantidad_total_productos:
 *                       type: integer
 *                     procesos_participados:
 *                       type: integer
 *                     procesos_completados:
 *                       type: integer
 *       400:
 *         description: Cédula requerida
 *       500:
 *         description: Error interno del servidor
 */
router.get('/estadisticas/:cedula', usuarioController.obtenerEstadisticasUsuario);

/**
 * @swagger
 * /api/ordenes-recientes/{cedula}:
 *   get:
 *     summary: Obtiene las órdenes recientes gestionadas por un usuario
 *     tags: [Perfil de Usuario]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del usuario
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de órdenes a retornar
 *     responses:
 *       200:
 *         description: Órdenes recientes obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_orden:
 *                         type: integer
 *                       fecha_aproximada:
 *                         type: string
 *                         format: date
 *                       tipo_pago:
 *                         type: string
 *                       prioridad_orden:
 *                         type: string
 *                       cliente_nombre:
 *                         type: string
 *                       ciudad:
 *                         type: string
 *                       departamento:
 *                         type: string
 *                       total_productos:
 *                         type: integer
 *                       cantidad_total:
 *                         type: integer
 *       400:
 *         description: Cédula requerida
 *       500:
 *         description: Error interno del servidor
 */
router.get('/ordenes-recientes/:cedula', usuarioController.obtenerOrdenesRecientesUsuario);

/**
 * @swagger
 * /api/historial-actividades/{cedula}:
 *   get:
 *     summary: Obtiene el historial de actividades de un usuario
 *     tags: [Perfil de Usuario]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del usuario
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Límite de actividades a retornar
 *     responses:
 *       200:
 *         description: Historial de actividades obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_historial:
 *                         type: integer
 *                       fecha_participacion:
 *                         type: string
 *                         format: date-time
 *                       observaciones:
 *                         type: string
 *                       accion:
 *                         type: string
 *                       cantidad_total_avanzada:
 *                         type: integer
 *                       nombre_proceso:
 *                         type: string
 *                       id_orden:
 *                         type: integer
 *                       cliente_nombre:
 *                         type: string
 *       400:
 *         description: Cédula requerida
 *       500:
 *         description: Error interno del servidor
 */
router.get('/historial-actividades/:cedula', usuarioController.obtenerHistorialActividadesUsuario);

module.exports = router;
