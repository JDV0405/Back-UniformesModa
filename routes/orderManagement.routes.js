const express = require('express');
const router = express.Router();
const { UserController, OrderController } = require('../controllers/orderManagement.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// Rutas de autenticación (públicas)
router.post('/login', UserController.login);

// Middleware de autenticación para rutas protegidas
router.use(authMiddleware);

// Rutas de usuario (protegidas)
router.get('/profile', UserController.getProfile);

// Rutas de órdenes (protegidas)
router.get('/orders/process/:idProceso', OrderController.getOrdersByRole);
router.get('/orders/all', OrderController.getAllOrders);
router.post('/orders/advance', OrderController.advanceOrder);
router.get('/orders/:idOrden', OrderController.getOrderDetails);

module.exports = router;