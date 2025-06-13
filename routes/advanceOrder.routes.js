const express = require('express');
const router = express.Router();
const advanceOrderController = require('../controllers/advanceOrder.controller');
const authMiddleware = require('../middlewares/auth.middleware.js');

router.use(authMiddleware);
// Obtener todos los productos de una orden
router.get('/orden/:idOrden', advanceOrderController.getOrderProducts);

// Obtener productos que están en un proceso específico
router.get('/orden/:idOrden/proceso/:idProceso', advanceOrderController.getProductsInProcess);

// Avanzar productos al siguiente proceso
router.post('/avanzar', advanceOrderController.advanceProducts);

// Obtener confeccionistas activos
router.get('/confeccionistas', advanceOrderController.getActiveConfeccionistas);

// Obtener órdenes por proceso
router.get('/proceso/:idProceso', advanceOrderController.getOrdersByProcess);

// Obtener detalle de una orden
router.get('/orden/:idOrden/detalle', advanceOrderController.getOrderDetail);

// Completar una orden
router.post('/completed', advanceOrderController.completeOrder);

// Obtener órdenes completadas
router.get('/ordersCompleted', advanceOrderController.getCompletedOrders);

// Obtener detalle de una orden completada
router.get('/ordenes-completadas/:idOrden', advanceOrderController.getCompletedOrderDetail);


module.exports = router;