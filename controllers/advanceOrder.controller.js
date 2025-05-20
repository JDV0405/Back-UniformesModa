const AdvanceOrderModel = require('../models/advanceOrder.models');

class AdvanceOrderController {
 // Obtiene los productos de una orden
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

 // Obtiene los productos que están actualmente en un proceso específico
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
}

module.exports = new AdvanceOrderController();