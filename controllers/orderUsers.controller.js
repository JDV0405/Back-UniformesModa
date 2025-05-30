const usuarioModel = require('../models/orderUsers.model.js');

const getOrdersByClientId = async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    if (!clienteId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El ID del cliente es requerido' 
      });
    }
    
    const result = await usuarioModel.getOrdersByClientId(clienteId);
    
    if (!result.clienteExiste) {
      return res.status(404).json({
        success: false,
        message: `No se encontró cliente con ID: ${clienteId}`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result.orders,
      message: result.orders.length > 0 
        ? 'Órdenes obtenidas exitosamente' 
        : 'El cliente no tiene órdenes registradas'
    });
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las órdenes',
      error: error.message
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El ID de la orden es requerido' 
      });
    }
    
    const orderDetails = await usuarioModel.getOrderDetailsById(orderId);
    
    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: orderDetails,
      message: 'Detalles de la orden obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener detalles de la orden:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los detalles de la orden',
      error: error.message
    });
  }
};

module.exports = {
  getOrdersByClientId,
  getOrderDetails,
};