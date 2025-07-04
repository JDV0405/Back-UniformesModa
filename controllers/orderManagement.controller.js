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
        { 
          id: user.id_usuario, 
          rol: user.id_rol, 
          cedula: user.cedula,
          roles: user.roles || [] 
        },
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
            cedula: user.cedula,
            nombre: `${user.nombre} ${user.apellidos}`,
            email: user.email,
            rol: {
              id: user.id_rol,
              nombre: user.nombre_rol
            },
            roles: user.roles || []
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
          },
          roles: empleado.roles || []
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

  updateOrder: async (req, res) => {
    try {
      const { idOrden } = req.params;
      const orderData = req.body;
      
      // Validar que se proporcionó un ID de orden
      if (!idOrden) {
        return res.status(400).json({
          success: false,
          message: 'ID de orden no proporcionado'
        });
      }
      
      const updatedOrder = await OrderModel.updateOrder(idOrden, orderData);
      
      res.status(200).json({
        success: true,
        message: 'Orden actualizada correctamente',
        data: updatedOrder
      });
      
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      
      // Manejo específico de errores
      if (error.message.includes('Orden no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          error: error.message
        });
      }
      
      if (error.message.includes('no se puede eliminar el producto')) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar uno o más productos',
          error: error.message
        });
      }
      
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