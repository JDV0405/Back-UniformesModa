const { UserModel, OrderModel } = require('../models/orderManagement.model.js'); // Importar modelos
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'uniformes_moda_secret_key';
const JWT_EXPIRES = '24h';

const UserController = {
  // Login de usuarios
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email y contraseña son requeridos' 
        });
      }
      
      const user = await UserModel.login(email, password);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciales inválidas o usuario inactivo' 
        });
      }
      
      // Generar token JWT
      const token = jwt.sign(
        { id: user.id_usuario, rol: user.id_rol, cedula: user.cedula },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      
      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          usuario: {
            id: user.id_usuario,
            nombre: `${user.nombre} ${user.apellidos}`,
            email: user.email,
            rol: {
              id: user.id_rol,
              nombre: user.nombre_rol
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },
  
  // Obtener perfil del usuario actual
  getProfile: async (req, res) => {
    try {
      const { userId } = req;
      
      const empleado = await UserModel.getEmployeeByUserId(userId);
      
      if (!empleado) {
        return res.status(404).json({ 
          success: false, 
          message: 'Perfil no encontrado' 
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          cedula: empleado.cedula,
          nombre: empleado.nombre,
          apellidos: empleado.apellidos,
          telefono: empleado.telefono,
          rol: {
            id: empleado.id_rol,
            nombre: empleado.nombre_rol,
            descripcion: empleado.descripcion
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  }
};

const OrderController = {
  // Obtener órdenes según el rol y proceso
  getOrdersByRole: async (req, res) => {
    try {
      const { idProceso } = req.params;
      
      // Ya no necesitamos diferenciar por rol, todos ven las mismas órdenes del proceso
      const orders = await OrderModel.getOrdersByProcess(idProceso);
      
      res.status(200).json({
        success: true,
        data: orders
      });
      
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },
  
  // Avanzar una orden al siguiente proceso
  advanceOrder: async (req, res) => {
    try {
      const { idDetalleProcesoActual, idProcesoSiguiente, cedulaEmpleadoSiguiente, observaciones } = req.body;
      const cedulaEmpleadoActual = req.cedula; // Obtenemos la cédula del empleado actual del token JWT
      
      if (!idDetalleProcesoActual || !idProcesoSiguiente) {
        return res.status(400).json({ 
          success: false, 
          message: 'El detalle del proceso actual y el ID del proceso siguiente son obligatorios' 
        });
      }
      
      // Ahora pasamos la cédula del empleado actual que está avanzando la orden
      const result = await OrderModel.advanceOrderToNextProcess(
        idDetalleProcesoActual,
        idProcesoSiguiente,
        cedulaEmpleadoActual,           // Empleado que está avanzando la orden
        cedulaEmpleadoSiguiente || null, // Empleado asignado al siguiente proceso (opcional)
        observaciones || ''
      );
      
      res.status(200).json({
        success: true,
        message: 'Orden avanzada al siguiente proceso correctamente',
        data: result
      });
      
    } catch (error) {
      console.error('Error al avanzar orden:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },

  completeOrder: async (req, res) => {
    try {
      const { idOrden, observaciones } = req.body;
      const cedulaEmpleado = req.cedula; // Obtenemos la cédula del empleado del token JWT
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'El ID de la orden es obligatorio' 
        });
      }
      
      const result = await OrderModel.completeOrder(
        idOrden,
        cedulaEmpleado,
        observaciones || ''
      );
      
      res.status(200).json({
        success: true,
        message: 'Orden finalizada correctamente',
        data: result
      });
      
    } catch (error) {
      console.error('Error al finalizar orden:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },
  
  // Obtener detalles de una orden
  getOrderDetails: async (req, res) => {
    try {
      const { idOrden } = req.params;
      
      const orderDetails = await OrderModel.getOrderDetails(idOrden);
      
      res.status(200).json({
        success: true,
        data: orderDetails
      });
      
    } catch (error) {
      console.error('Error al obtener detalles de la orden:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },
  
  getAllOrders: async (req, res) => {
    try {
      const orders = await OrderModel.getAllOrders();
      
      // Si no hay órdenes, devolvemos un array vacío en lugar de error
      res.status(200).json({
        success: true,
        data: orders
      });
      
    } catch (error) {
      console.error('Error al obtener todas las órdenes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },

  getCompletedOrders: async (req, res) => {
    try {
      const completedOrders = await OrderModel.getCompletedOrders();
      
      res.status(200).json({
        success: true,
        data: completedOrders
      });
      
    } catch (error) {
      console.error('Error al obtener órdenes completadas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },

  advancePartialOrder: async (req, res) => {
    try {
      const { 
        idOrden, 
        idProcesoActual, 
        idProcesoSiguiente, 
        itemsToAdvance, 
        observaciones 
      } = req.body;
      
      const cedulaEmpleadoActual = req.cedula; // From JWT token
      
      if (!idOrden || !idProcesoActual || !idProcesoSiguiente || !itemsToAdvance || !Array.isArray(itemsToAdvance) || itemsToAdvance.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Datos incompletos o inválidos para avanzar parcialmente la orden' 
        });
      }
      
      // Validar estructura de cada item
      for (const item of itemsToAdvance) {
        if (!item.idDetalle || !item.cantidad || item.cantidad <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada ítem debe tener un idDetalle y una cantidad válida mayor a cero'
          });
        }
      }
      
      const result = await OrderModel.advancePartialOrderToNextProcess(
        idOrden,
        idProcesoActual,
        idProcesoSiguiente,
        cedulaEmpleadoActual,
        itemsToAdvance,
        observaciones || ''
      );
      
      res.status(200).json({
        success: true,
        message: 'Items avanzados al siguiente proceso correctamente',
        data: result
      });
      
    } catch (error) {
      console.error('Error al avanzar parcialmente orden:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },

  // Get product details for an order
  getOrderProductDetails: async (req, res) => {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de orden es requerido' 
        });
      }
      
      const products = await OrderModel.getOrderProductDetails(idOrden);
      
      res.status(200).json({
        success: true,
        data: products
      });
      
    } catch (error) {
      console.error('Error al obtener detalles de productos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },

  getProductsInProcess: async (req, res) => {
    try {
      const { idOrden, idProceso } = req.params;
      
      if (!idOrden || !idProceso) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de orden y proceso son requeridos' 
        });
      }
      
      const products = await OrderModel.getProductsInProcess(idOrden, idProceso);
      
      res.status(200).json({
        success: true,
        data: products
      });
      
    } catch (error) {
      console.error('Error al obtener productos en proceso:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  },

  getProductMovementHistory: async (req, res) => {
    try {
      const { idDetalle } = req.params;
      
      if (!idDetalle) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID del detalle de producto es requerido' 
        });
      }
      
      const history = await OrderModel.getProductMovementHistory(idDetalle);
      
      res.status(200).json({
        success: true,
        data: history
      });
      
    } catch (error) {
      console.error('Error al obtener historial de movimiento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  }


};





module.exports = {
  UserController,
  OrderController
};