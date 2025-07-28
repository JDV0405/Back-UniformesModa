const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/createUsers.controller.js');

/**
 * @swagger
 * /api/createUsers:
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
 * /api/getAllUsers:
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
 * /api/editUsers/{cedula}:
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
 *     summary: Obtiene el perfil completo de un usuario con toda su información
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
 *                     datos_usuario:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                           description: Email del usuario
 *                         estado_cuenta:
 *                           type: string
 *                           description: Estado de la cuenta (Activo/Inactivo)
 *                     datos_empleado:
 *                       type: object
 *                       properties:
 *                         cedula:
 *                           type: string
 *                           description: Cédula del empleado
 *                         nombre:
 *                           type: string
 *                           description: Nombre del empleado
 *                         apellidos:
 *                           type: string
 *                           description: Apellidos del empleado
 *                         telefono:
 *                           type: string
 *                           description: Teléfono del empleado
 *                         estado:
 *                           type: string
 *                           description: Estado del empleado (Activo/Inactivo)
 *                     roles_asignados:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_rol:
 *                             type: integer
 *                           nombre_rol:
 *                             type: string
 *                           descripcion:
 *                             type: string
 *                           activo:
 *                             type: boolean
 *                       description: Roles asignados al empleado (ej. Confección, Entrega, etc.)
 *                     estadisticas_participacion:
 *                       type: object
 *                       properties:
 *                         cantidad_procesos_participados:
 *                           type: integer
 *                           description: Cantidad de procesos en los que ha participado
 *                         ultima_participacion_proceso:
 *                           type: object
 *                           description: Información de la última participación en un proceso
 *                           properties:
 *                             id_detalle_proceso:
 *                               type: integer
 *                             fecha_inicio:
 *                               type: string
 *                               format: date-time
 *                             fecha_final:
 *                               type: string
 *                               format: date-time
 *                             estado:
 *                               type: string
 *                             nombre_proceso:
 *                               type: string
 *                             id_orden:
 *                               type: integer
 *                         cantidad_ordenes_responsable:
 *                           type: integer
 *                           description: Cantidad de órdenes donde fue responsable
 *                         total_acciones_historial:
 *                           type: integer
 *                           description: Total de acciones registradas en el historial (bitácora)
 *                         ultima_accion_registrada:
 *                           type: object
 *                           description: Información de la última acción registrada
 *                           properties:
 *                             id_historial:
 *                               type: integer
 *                             fecha_participacion:
 *                               type: string
 *                               format: date-time
 *                             accion:
 *                               type: string
 *                             observaciones:
 *                               type: string
 *                             cantidad_total_avanzada:
 *                               type: integer
 *                             nombre_proceso:
 *                               type: string
 *                             id_orden:
 *                               type: integer
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

/**
 * @swagger
 * /api/perfil/:cedula/estadisticas/:id_rol:
 *   get:
 *     summary: Obtiene estadísticas específicas por rol de un usuario
 *     tags: [Perfil de Usuario]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del usuario
 *       - in: path
 *         name: id_rol
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del rol
 *     responses:
 *       200:
 *         description: Estadísticas específicas por rol obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Estadísticas específicas que varían según el rol
 *                   examples:
 *                     Administrador:
 *                       total_usuarios: 25
 *                       usuarios_activos: 20
 *                       ordenes_supervision: 150
 *                       procesos_supervisados: 300
 *                     Solicitudes:
 *                       solicitudes_creadas: 45
 *                       solicitudes_pendientes: 8
 *                       solicitudes_aprobadas: 35
 *                       solicitudes_rechazadas: 2
 *                     Cortes:
 *                       cortes_realizados: 120
 *                       metros_cortados: 2500
 *                       ordenes_corte_completadas: 95
 *                       material_desperdiciado: 5.2
 *                     Confección:
 *                       prendas_confeccionadas: 350
 *                       tiempo_promedio: 4.5
 *                       calidad_promedio: 95.8
 *                       reprocesos: 12
 *                     Bordado:
 *                       bordados_realizados: 180
 *                       diseños_creados: 25
 *                       tiempo_bordado: 145.5
 *                       calidad_bordado: 98.2
 *                     Facturación:
 *                       facturas_generadas: 75
 *                       ingresos_totales: 15000000
 *                       pagos_procesados: 70
 *                       facturas_pendientes: 5
 *                     Entrega:
 *                       entregas_realizadas: 68
 *                       entregas_pendientes: 12
 *                       kilometros_recorridos: 1250
 *                       satisfaccion_cliente: 92.5
 *       400:
 *         description: Cédula e ID de rol requeridos
 *       404:
 *         description: Rol no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/perfil/:cedula/estadisticas/:id_rol', usuarioController.obtenerEstadisticasEspecificasPorRol);

module.exports = router;
