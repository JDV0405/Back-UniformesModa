const AdvanceProcessModel = require('../models/advanceProcess.models');

const AdvanceProcessController = {
  /**
   * Avanzar una orden completa a un nuevo proceso
   */
  advanceOrderProcess: async (req, res) => {
    try {
      const { orderId, targetProcessId, employeeId, observations } = req.body;
      
      if (!orderId || !targetProcessId || !employeeId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requieren ID de orden, ID de proceso destino e ID de empleado' 
        });
      }
      
      const result = await AdvanceProcessModel.advanceOrderProcess(
        orderId, 
        targetProcessId, 
        employeeId, 
        observations || ''
      );
      
      return res.status(200).json({
        success: true,
        message: 'Orden avanzada exitosamente al nuevo proceso',
        data: result
      });
    } catch (error) {
      console.error('Error avanzando orden:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al avanzar la orden'
      });
    }
  },
  
  /**
   * Avanzar productos específicos de una orden a un nuevo proceso
   */
  advanceProductProcess: async (req, res) => {
    try {
      const { orderId, targetProcessId, employeeId, productDetails, observations } = req.body;
      
      if (!orderId || !targetProcessId || !employeeId || !productDetails || !Array.isArray(productDetails)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requieren ID de orden, ID de proceso destino, ID de empleado y detalles de productos' 
        });
      }
      
      // Validar formato de detalles de productos
      for (const detail of productDetails) {
        if (!detail.productDetailId || !detail.quantity) {
          return res.status(400).json({
            success: false,
            message: 'Cada detalle de producto debe contener productDetailId y quantity'
          });
        }
      }
      
      const result = await AdvanceProcessModel.advanceProductProcess(
        orderId, 
        targetProcessId, 
        employeeId, 
        productDetails,
        observations || ''
      );
      
      return res.status(200).json({
        success: true,
        message: 'Productos avanzados exitosamente al nuevo proceso',
        data: result
      });
    } catch (error) {
      console.error('Error avanzando productos:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al avanzar los productos'
      });
    }
  },
  
  /**
   * Obtener historial de procesos de una orden
   */
  getOrderProcessHistory: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de orden'
        });
      }
      
      const history = await AdvanceProcessModel.getOrderProcessHistory(orderId);
      
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error obteniendo historial de procesos:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener el historial de procesos'
      });
    }
  },
  
  /**
   * Obtener distribución de productos por procesos para una orden
   */
  getOrderProductDistribution: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de orden'
        });
      }
      
      const distribution = await AdvanceProcessModel.getOrderProductDistribution(orderId);
      
      return res.status(200).json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('Error obteniendo distribución de productos:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener la distribución de productos'
      });
    }
  },
  
  /**
   * Obtener productos parcialmente avanzados para una orden
   */
  getPartiallyAdvancedProducts: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de orden'
        });
      }
      
      const products = await AdvanceProcessModel.getPartiallyAdvancedProducts(orderId);
      
      return res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error obteniendo productos parcialmente avanzados:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener los productos parcialmente avanzados'
      });
    }
  },
  
  /**
   * Obtener detalles de productos avanzados con sus procesos actual y anterior
   */
  getAdvancedProductsDetail: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de orden'
        });
      }
      
      const advancedProducts = await AdvanceProcessModel.getAdvancedProductsDetail(orderId);
      
      return res.status(200).json({
        success: true,
        data: advancedProducts
      });
    } catch (error) {
      console.error('Error obteniendo detalles de productos avanzados:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener los detalles de productos avanzados'
      });
    }
  },
  
  /**
   * Obtener productos en un proceso específico
   */
  getProductsByProcess: async (req, res) => {
    try {
      const { processId } = req.params;
      
      if (!processId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de proceso'
        });
      }
      
      const products = await AdvanceProcessModel.getProductsByProcess(processId);
      
      return res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error obteniendo productos por proceso:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener los productos por proceso'
      });
    }
  },
  
  /**
   * Obtener todas las órdenes activas
   */
  getAllActiveOrders: async (req, res) => {
    try {
      const orders = await AdvanceProcessModel.getAllActiveOrders();
      
      return res.status(200).json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error obteniendo órdenes activas:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener las órdenes activas'
      });
    }
  },
  
  /**
   * Obtener detalles completos de una orden
   */
  getOrderDetails: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de orden'
        });
      }
      
      const orderDetails = await AdvanceProcessModel.getOrderDetails(orderId);
      
      return res.status(200).json({
        success: true,
        data: orderDetails
      });
    } catch (error) {
      console.error('Error obteniendo detalles de orden:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Ocurrió un error al obtener los detalles de la orden'
      });
    }
  }
};

module.exports = AdvanceProcessController;