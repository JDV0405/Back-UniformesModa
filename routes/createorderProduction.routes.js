const express = require('express');
const router = express.Router();
const orderController = require('../controllers/createorderProduction.controller');

// Create new order route
router.post('/createOrder', 
    orderController.uploadMiddleware, 
    orderController.createOrder
);

module.exports = router;