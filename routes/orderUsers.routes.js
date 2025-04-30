const express = require('express');
const router = express.Router();
const orderUserController = require('../controllers/orderUsers.controller.js');

/**
 * @route GET /api/orders/employee/:cedula
 * @desc Obtiene todas las órdenes asociadas a una cédula de empleado
 * @access Private
 */
router.get('/customer/:clienteId', orderUserController.getOrdersByClientId);

/**
 * @route GET /api/orders/:orderId
 * @desc Obtiene los detalles completos de una orden específica
 * @access Private
 */
router.get('/:orderId', orderUserController.getOrderDetails);

module.exports = router;