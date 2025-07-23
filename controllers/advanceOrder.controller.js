const AdvanceOrderModel = require('../models/advanceOrder.models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para archivos de factura
const facturaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\facturas';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `factura-${uniqueSuffix}${extension}`);
  }
});

const uploadFactura = multer({
  storage: facturaStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten: PDF, JPG, JPEG, PNG, DOC, DOCX'));
    }
  }
});

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
      const { page = 1, limit = 50 } = req.query;
      
      if (!idProceso) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID del proceso' 
        });
      }

      // Validar parámetros de paginación
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      
      if (isNaN(pageInt) || pageInt < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'El parámetro page debe ser un número mayor a 0' 
        });
      }
      
      if (isNaN(limitInt) || limitInt < 1 || limitInt > 100) {
        return res.status(400).json({ 
          success: false, 
          message: 'El parámetro limit debe ser un número entre 1 y 100' 
        });
      }
      
      const result = await AdvanceOrderModel.getOrdersByProcess(idProceso, pageInt, limitInt);
      return res.status(200).json({
        success: true,
        ...result,
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
    // Configurar multer para este endpoint específico
    const upload = uploadFactura.single('factura_file');
    
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: `Error al subir archivo: ${err.message}`
        });
      }
      
      try {
        
        // Validar que req.body existe
        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({
            success: false,
            message: 'El cuerpo de la petición está vacío o no es válido'
          });
        }
        
        // Extraer datos del body
        const { 
          idOrden, 
          idProcesoActual, 
          idProcesoSiguiente, 
          cedulaEmpleadoActual,
          itemsToAdvance,
          observaciones,
          numero_factura,
          observaciones_factura
        } = req.body;
        
        // Parsear itemsToAdvance si viene como string
        let parsedItemsToAdvance;
        try {
          parsedItemsToAdvance = typeof itemsToAdvance === 'string' ? JSON.parse(itemsToAdvance) : itemsToAdvance;
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: 'Error al parsear itemsToAdvance: debe ser un array válido'
          });
        }
        
        // Validar que itemsToAdvance existe y es un array
        if (!parsedItemsToAdvance || !Array.isArray(parsedItemsToAdvance)) {
          return res.status(400).json({
            success: false,
            message: 'itemsToAdvance debe ser un array válido'
          });
        }
        
        // Validaciones básicas
        if (!idOrden || !idProcesoActual || !idProcesoSiguiente || !cedulaEmpleadoActual || !parsedItemsToAdvance.length) {
          return res.status(400).json({
            success: false,
            message: 'Faltan datos obligatorios: idOrden, idProcesoActual, idProcesoSiguiente, cedulaEmpleadoActual, itemsToAdvance'
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
        for (const item of parsedItemsToAdvance) {
          if (!item.idDetalle || !item.cantidadAvanzar) {
            return res.status(400).json({
              success: false,
              message: 'Cada producto debe tener idDetalle y cantidadAvanzar'
            });
          }
          
          if (parseInt(item.cantidadAvanzar) <= 0) {
            return res.status(400).json({
              success: false,
              message: 'La cantidad a avanzar debe ser mayor que 0'
            });
          }
        }
        
        // Validar datos de factura para transición facturación -> entrega
        let facturaData = null;
        if (parseInt(idProcesoActual) === 6 && parseInt(idProcesoSiguiente) === 7) {
          if (!numero_factura) {
            return res.status(400).json({
              success: false,
              message: 'Para pasar de facturación a entrega se requiere el número de factura'
            });
          }
          
          if (!req.file) {
            return res.status(400).json({
              success: false,
              message: 'Para pasar de facturación a entrega se requiere adjuntar el archivo de factura'
            });
          }
          
          // Crear la URL del archivo
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const facturaUrl = `${baseUrl}/facturas/${req.file.filename}`;
          
          facturaData = {
            numero_factura,
            url_factura: facturaUrl,
            observaciones: observaciones_factura || null
          };
        }
        
        await AdvanceOrderModel.advanceProductsToNextProcess({
          idOrden, 
          idProcesoActual, 
          idProcesoSiguiente, 
          cedulaEmpleadoActual,
          itemsToAdvance: parsedItemsToAdvance,
          observaciones,
          facturaData
        });
        
        return res.status(200).json({
          success: true,
          message: 'Productos avanzados exitosamente al siguiente proceso',
          ...(facturaData && { facturaCreada: facturaData })
        });
      } catch (error) {
        // Si hay error y se subió un archivo, eliminarlo
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkError) {
            console.error('Error al eliminar archivo:', unlinkError);
          }
        }
        
        // Manejar errores específicos de validación
        if (error.message.includes('Ya existe una factura con el número')) {
          return res.status(409).json({
            success: false,
            message: error.message
          });
        }
        
        return res.status(500).json({
          success: false,
          message: `Error al avanzar productos: ${error.message}`
        });
      }
    });
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

  // Obtener facturas de una orden específica
  async getOrderFacturas(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const facturas = await AdvanceOrderModel.getOrderFacturas(idOrden);
      return res.status(200).json({
        success: true,
        data: facturas,
        message: 'Facturas de la orden obtenidas correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener facturas de la orden: ${error.message}`
      });
    }
  }

  // Obtener historial de un proceso específico
  async getProcessEmployeeHistory(req, res) {
    try {
      const { idDetalleProceso } = req.params;
      
      if (!idDetalleProceso) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID del detalle de proceso' 
        });
      }
      
      const historial = await AdvanceOrderModel.getProcessEmployeeHistory(idDetalleProceso);
      return res.status(200).json({
        success: true,
        data: historial,
        message: 'Historial del proceso obtenido correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener historial del proceso: ${error.message}`
      });
    }
  }

  // Obtener log completo de auditoría
  async getOrderAuditLog(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const auditLog = await AdvanceOrderModel.getOrderAuditLog(idOrden);
      return res.status(200).json({
        success: true,
        ...auditLog,
        message: 'Log de auditoría obtenido correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener log de auditoría: ${error.message}`
      });
    }
  }

  // Obtener historial detallado de empleados con productos específicos
  async getDetailedEmployeeAdvanceHistory(req, res) {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID de la orden' 
        });
      }
      
      const historial = await AdvanceOrderModel.getDetailedEmployeeAdvanceHistory(idOrden);
      return res.status(200).json({
        success: true,
        data: historial,
        message: 'Historial detallado de empleados obtenido correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error al obtener historial detallado de empleados: ${error.message}`
      });
    }
  }
}



module.exports = new AdvanceOrderController();