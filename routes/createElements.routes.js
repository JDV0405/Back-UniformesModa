const express = require('express');
const router = express.Router();
const { changePriorityOrder } = require('../controllers/createElements.controller');

// Ruta para cambiar la prioridad de una orden
// PUT /api/orders/:id_orden/priority
router.put('/orders/:id_orden/priority', changePriorityOrder);

module.exports = router;