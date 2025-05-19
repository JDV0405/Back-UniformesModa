const express = require('express');
const router = express.Router();
const AdvanceProcessController = require('../controllers/advanceProcess.controller');

// Rutas para avanzar procesos
router.post('/order', AdvanceProcessController.advanceOrderProcess);
router.post('/products', AdvanceProcessController.advanceProductProcess);

// Rutas para consultar historial y estado
router.get('/history/:orderId', AdvanceProcessController.getOrderProcessHistory);
router.get('/distribution/:orderId', AdvanceProcessController.getOrderProductDistribution);
router.get('/partially-advanced/:orderId', AdvanceProcessController.getPartiallyAdvancedProducts);
router.get('/advanced-products/:orderId', AdvanceProcessController.getAdvancedProductsDetail);

// Rutas para consultar por proceso
router.get('/process/:processId', AdvanceProcessController.getProductsByProcess);

// Rutas para consultar órdenes activas
router.get('/active-orders', AdvanceProcessController.getAllActiveOrders);
router.get('/order-details/:orderId', AdvanceProcessController.getOrderDetails);

module.exports = router;