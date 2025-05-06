const express = require('express');
const router = express.Router();
const orderController = require('../controllers/createorderProduction.controller');

/**
 * @swagger
 * /api/create/createOrder:
 *   post:
 *     summary: Crea una nueva orden de producción
 *     description: Crea una orden de producción con información del cliente, productos y comprobante de pago
 *     tags: [Órdenes]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cedulaEmpleadoResponsable
 *               - cedula
 *               - nombre
 *               - tipoCliente
 *               - numeroCelular
 *               - correo
 *               - direccionEntrega
 *               - idCiudad
 *               - tipoPago
 *               - productos
 *             properties:
 *               nombreAsesor:
 *                 type: string
 *                 description: Cédula o nombre del asesor/empleado responsable
 *               fechaAproximada:
 *                 type: string
 *                 format: date
 *                 description: Fecha aproximada de entrega (YYYY-MM-DD)
 *               observaciones:
 *                 type: string
 *                 description: Observaciones generales de la orden
 *               cedula:
 *                 type: string
 *                 description: Número de cédula o NIT del cliente
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del cliente o razón social
 *               tipoCliente:
 *                 type: string
 *                 enum: [Natural, Juridico]
 *                 description: Tipo de cliente (Natural o Juridico)
 *               tipoDocumento:
 *                 type: string
 *                 enum: [Cedula de Ciudadania, Pasaporte, Cedula Extranjeria]
 *                 description: Tipo de documento para clientes naturales
 *               profesion:
 *                 type: string
 *                 description: Profesión para clientes naturales
 *               sectorEconomico:
 *                 type: string
 *                 description: Sector económico para clientes jurídicos
 *               numeroCelular:
 *                 type: string
 *                 description: Número de teléfono móvil del cliente
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del cliente
 *               direccionEntrega:
 *                 type: string
 *                 description: Dirección de entrega
 *               idCiudad:
 *                 type: string
 *                 description: ID de la ciudad de entrega
 *               tipoPago:
 *                 type: string
 *                 enum: [contado, crédito]
 *                 description: Tipo de pago (contado o crédito)
 *               productos:
 *                 type: string
 *                 description: Array JSON de productos en formato string
 *                 example: "[{\"idProducto\":1,\"cantidad\":5,\"atributosUsuario\":{\"talla\":\"M\",\"color\":\"Azul\"},\"bordado\":true,\"observacion\":\"Logo en bolsillo\",\"urlProducto\":null}]"
 *               comprobanteFile:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de comprobante de pago (requerido si el tipo de pago es contado)
 *     responses:
 *       200:
 *         description: Orden creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_orden:
 *                       type: integer
 *                       example: 3
 *                     id_cliente:
 *                       type: integer
 *                       example: 101
 *                     fecha_aproximada:
 *                       type: string
 *                       format: date-time
 *                       example: "2022-06-20T05:00:00.000Z"
 *                     tipo_pago:
 *                       type: string
 *                       example: "Transferencia"
 *                     id_comprobante_pago:
 *                       type: integer
 *                       example: 1
 *                     observaciones:
 *                       type: string
 *                       example: "Urgente para evento"
 *                     cedula_empleado_responsable:
 *                       type: string
 *                       example: "1010"
 *                     cliente_nombre:
 *                       type: string
 *                       example: "Comercial S.A."
 *                     productos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProductoOrden'
 *                     procesos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProcesoOrden'
 *                 message:
 *                   type: string
 *                   example: "Detalles de la orden obtenidos exitosamente"
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El nombre del asesor es requerido"
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error al crear la orden"
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor"
 */


/**
 * @swagger
 * components:
 *   schemas:
 *     ProductoOrden:
 *       type: object
 *       properties:
 *         id_detalle:
 *           type: integer
 *           example: 6
 *         id_orden:
 *           type: integer
 *           example: 3
 *         id_producto:
 *           type: integer
 *           example: 3
 *         cantidad:
 *           type: integer
 *           example: 1
 *         atributosusuario:
 *           type: object
 *           example: {"talla": "XL", "impermeable": true, "texto_espalda": "TEAM 2025"}
 *         bordado:
 *           type: boolean
 *           example: false
 *         observacion:
 *           type: string
 *           example: "Texto en blanco"
 *         url_producto:
 *           type: string
 *           example: "https://img.com/chaqueta1.jpg"
 *         estado:
 *           type: string
 *           example: "En Producción"
 *         nombre_producto:
 *           type: string
 *           example: "Chaqueta impermeable"
 *     
 *     ProcesoOrden:
 *       type: object
 *       properties:
 *         id_detalle_proceso:
 *           type: integer
 *           example: 3
 *         id_orden:
 *           type: integer
 *           example: 3
 *         id_proceso:
 *           type: integer
 *           example: 4
 *         fecha_inicio_proceso:
 *           type: string
 *           format: date-time
 *           example: "2025-05-02T15:58:40.887Z"
 *         fecha_final_proceso:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         cedula_empleado:
 *           type: string
 *           example: "1010"
 *         observaciones:
 *           type: string
 *           example: "Inicio de diseño"
 *         estado:
 *           type: string
 *           example: "En Proceso"
 *         nombre_proceso:
 *           type: string
 *           example: "Confección"
 */

// Create new order route
router.post('/createOrder', 
    orderController.uploadMiddleware, 
    orderController.createOrder
);

module.exports = router;