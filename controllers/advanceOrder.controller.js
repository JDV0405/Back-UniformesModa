const AdvanceOrderModel = require('../models/advanceOrder.models');

class AdvanceOrderController {
  async getOrderProducts(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const productos = await AdvanceOrderModel.getOrderProducts(idOrden);
      return res.status(200).json({
        success: true,
        data: productos,
        message: 'Productos de la orden obtenidos correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener productos: ${error.message}`
      });
    }
  }

  async getOrdersByProcess(req, res) {
    try {
      const { idProceso } = req.params;
      
      if (!idProceso) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID del proceso' 
        });
      }
      
      const ordenes = await AdvanceOrderModel.getOrdersByProcess(idProceso);
      return res.status(200).json({
        success: true,
        data: ordenes,
        message: 'Órdenes obtenidas correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener órdenes: ${error.message}`
      });
    }
  }

  async getProductsInProcess(req, res) {
    try {
      const { idOrden, idProceso } = req.params;
      
      if (!idOrden || !idProceso) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requieren IDs de orden y proceso' 
        });
      }
      
      const productos = await AdvanceOrderModel.getProductsInProcess(idOrden, idProceso);
      return res.status(200).json({
        success: true,
        data: productos,
        message: 'Productos en proceso obtenidos correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener productos en proceso: ${error.message}`
      });
    }
  }

 //Avanza productos al siguiente proceso
  async advanceProducts(req, res) {
      try {
        const { 
          idOrden, 
          idProcesoActual, 
          idProcesoSiguiente, 
          cedulaEmpleadoActual,
          itemsToAdvance,
          observaciones 
        } = req.body;
        
        // Validaciones
        if (!idOrden || !idProcesoActual || !idProcesoSiguiente || !cedulaEmpleadoActual || !itemsToAdvance || !itemsToAdvance.length) {
          return res.status(400).json({
            success: false,
            message: 'Faltan datos requeridos. Se necesita ID de orden, proceso actual, proceso siguiente, cédula del empleado y productos a avanzar'
          });
        }
        
        // Validar que los procesos sean diferentes
        if (parseInt(idProcesoActual) === parseInt(idProcesoSiguiente)) {
          return res.status(400).json({
            success: false,
            message: 'El proceso actual y el siguiente no pueden ser iguales'
          });
        }
        
        // Validar estructura de productos
        for (const item of itemsToAdvance) {
          if (!item.idDetalle) {
            return res.status(400).json({
              success: false,
              message: 'Cada producto debe tener un ID de detalle válido'
            });
          }
        }
        
        await AdvanceOrderModel.advanceProductsToNextProcess({
          idOrden, 
          idProcesoActual, 
          idProcesoSiguiente, 
          cedulaEmpleadoActual,
          itemsToAdvance,
          observaciones
        });
        
        return res.status(200).json({
          success: true,
          message: 'Productos avanzados exitosamente al siguiente proceso'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: `Error al avanzar productos: ${error.message}`
        });
      }
  }
  
  async getOrderDetail(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const orderDetail = await AdvanceOrderModel.getOrderDetail(idOrden);
      
      if (!orderDetail.success) {
        return res.status(404).json(orderDetail);
      }
      
      return res.status(200).json(orderDetail);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener detalles de la orden: ${error.message}`
      });
    }
  }
  
  async completeOrder(req, res) {
    try {
      const { 
        idOrden, 
        idProcesoEntrega, 
        cedulaEmpleado,
        observaciones 
      } = req.body;
      
      // Validaciones
      if (!idOrden || !idProcesoEntrega || !cedulaEmpleado) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos. Se necesita ID de orden, ID del proceso de entrega y cédula del empleado'
        });
      }
      
      await AdvanceOrderModel.completeOrder({
        idOrden, 
        idProcesoEntrega, 
        cedulaEmpleado,
        observaciones
      });
      
      return res.status(200).json({
        success: true,
        message: 'Orden completada exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al completar la orden: ${error.message}`
      });
    }
  }
}



module.exports = new AdvanceOrderController();