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

module.exports = router;