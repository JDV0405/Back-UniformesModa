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
  // Obtener productos con todos sus confeccionistas asignados
  async getProductsWithAllConfeccionistas(req, res) {
    try {
      const { idOrden, idProceso } = req.params;
      
      if (!idOrden || !idProceso) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requieren IDs de orden y proceso' 
        });
      }
      
      const productos = await AdvanceOrderModel.getProductsWithAllConfeccionistas(idOrden, idProceso);
      return res.status(200).json({
        success: true,
        data: productos,
        message: 'Productos con todos los confeccionistas obtenidos correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener productos con confeccionistas: ${error.message}`
      });
    }
  }
 //Avanza productos al siguiente proceso (MODIFICADO)
  async advanceProducts(req, res) {
  try {
    if (req.body.itemsToAdvance && Array.isArray(req.body.itemsToAdvance)) {
      req.body.itemsToAdvance.forEach((item, index) => {
        console.log(`- Item ${index}:`, JSON.stringify(item, null, 2));
      });
    }
    
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
      if (!item.idDetalle || !item.cantidadAvanzar || item.cantidadAvanzar <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cada producto debe tener un ID de detalle válido y una cantidad a avanzar mayor a 0'
        });
      }
      
      // Validar que si es transición de cortes a confección (proceso 3 a 4), se incluya confeccionista y fechas
      if (parseInt(idProcesoActual) === 3 && parseInt(idProcesoSiguiente) === 4) {
        if (!item.idConfeccionista) {
          return res.status(400).json({
            success: false,
            message: 'Se debe asignar un confeccionista cuando se pasa del proceso de cortes a confección'
          });
        }
        
        // Validar fechas requeridas para confeccionista
        if (!item.fechaRecibido || !item.fechaEntrega) {
          return res.status(400).json({
            success: false,
            message: 'Se debe especificar fecha de recibido y fecha de entrega cuando se asigna trabajo a un confeccionista'
          });
        }
        
        // Validar que la fecha de entrega sea posterior a la de recibido
        const fechaRecibido = new Date(item.fechaRecibido);
        const fechaEntrega = new Date(item.fechaEntrega);
        
        if (fechaEntrega <= fechaRecibido) {
          return res.status(400).json({
            success: false,
            message: 'La fecha de entrega debe ser posterior a la fecha de recibido'
          });
        }
      }
      
      // Validar que si viene de confección (proceso 4), se incluya idProductoProceso para identificar cuál grupo específico
      if (parseInt(idProcesoActual) === 4 && !item.idProductoProceso) {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar idProductoProceso cuando se avanza desde confección para identificar el grupo específico'
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

  async getCompletedOrders(req, res) {
    try {
      const ordenes = await AdvanceOrderModel.getCompletedOrders();
      return res.status(200).json({
        success: true,
        data: ordenes,
        message: 'Órdenes completadas obtenidas correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener órdenes completadas: ${error.message}`
      });
    }
  }
  
  // Obtener el detalle de una orden completada
  async getCompletedOrderDetail(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const orderDetail = await AdvanceOrderModel.getCompletedOrderDetail(idOrden);
      
      if (!orderDetail.success) {
        return res.status(404).json(orderDetail);
      }
      
      return res.status(200).json(orderDetail);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener detalle de la orden completada: ${error.message}`
      });
    }
  }
  // Obtener confeccionistas activos
  async getActiveConfeccionistas(req, res) {
    try {
      const confeccionistas = await AdvanceOrderModel.getActiveConfeccionistas();
      return res.status(200).json({
        success: true,
        data: confeccionistas,
        message: 'Confeccionistas obtenidos correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener confeccionistas: ${error.message}`
      });
    }
  }

  // Obtener procesos disponibles desde confección
  async getAvailableProcessesFromConfeccion(req, res) {
    try {
      const procesos = await AdvanceOrderModel.getAvailableProcessesFromConfeccion();
      return res.status(200).json({
        success: true,
        data: procesos,
        message: 'Procesos disponibles obtenidos correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener procesos disponibles: ${error.message}`
      });
    }
  }

  // Avanzar productos desde confección con bifurcación
  async advanceProductsFromConfeccion(req, res) {
    try {
      const { 
        idOrden, 
        idProcesoActual, 
        cedulaEmpleadoActual,
        itemsToAdvance,
        observaciones 
      } = req.body;
      
      // Validaciones
      if (!idOrden || !idProcesoActual || !cedulaEmpleadoActual || !itemsToAdvance || !itemsToAdvance.length) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos. Se necesita ID de orden, proceso actual, cédula del empleado y productos a avanzar'
        });
      }
      
      // Validar que estemos saliendo de confección
      if (parseInt(idProcesoActual) !== 4) {
        return res.status(400).json({
          success: false,
          message: 'Este endpoint solo puede ser usado cuando el proceso actual es confección (ID 4)'
        });
      }
      
      // Preparar mapeo de destinos por producto
      const destinosPorProducto = {};
      
      // Validar estructura de productos con destinos
      for (const item of itemsToAdvance) {
        if (!item.idDetalle || !item.cantidadAvanzar || item.cantidadAvanzar <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada producto debe tener un ID de detalle válido y una cantidad a avanzar mayor a 0'
          });
        }
        
        if (!item.idProductoProceso) {
          return res.status(400).json({
            success: false,
            message: 'Se debe especificar idProductoProceso cuando se avanza desde confección'
          });
        }
        
        if (!item.idProcesoDestino) {
          return res.status(400).json({
            success: false,
            message: 'Se debe especificar el proceso de destino para cada producto'
          });
        }
        
        // Validar que el proceso de destino sea válido (5=Bordado, 6=Facturación)
        if (![5, 6].includes(parseInt(item.idProcesoDestino))) {
          return res.status(400).json({
            success: false,
            message: 'El proceso de destino debe ser Bordado (5) o Facturación (6)'
          });
        }
        
        // Mapear destinos por producto
        destinosPorProducto[item.idDetalle] = {
          idProcesoDestino: item.idProcesoDestino,
          nombreProceso: item.idProcesoDestino === 5 ? 'Bordado' : 'Facturación'
        };
      }
      
      // No usar proceso por defecto cuando hay bifurcación para evitar registros vacíos
      await AdvanceOrderModel.advanceProductsToNextProcess({
        idOrden, 
        idProcesoActual, 
        idProcesoSiguiente: null, // null indica que se usarán solo los destinos específicos
        cedulaEmpleadoActual,
        itemsToAdvance,
        observaciones,
        destinosPorProducto
      });
      
      return res.status(200).json({
        success: true,
        message: 'Productos avanzados exitosamente desde confección con bifurcación'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al avanzar productos desde confección: ${error.message}`
      });
    }
  }

  // Limpiar procesos vacíos de una orden
  async cleanEmptyProcesses(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const processesDeleted = await AdvanceOrderModel.cleanEmptyProcesses(idOrden);
      
      return res.status(200).json({
        success: true,
        data: { processesDeleted },
        message: `Se eliminaron ${processesDeleted} procesos vacíos`
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al limpiar procesos vacíos: ${error.message}`
      });
    }
  }
}



module.exports = new AdvanceOrderController();