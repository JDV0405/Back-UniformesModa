const { UserModel, OrderModel } = require('../models/orderManagement.model.js'); // Importar modelos
const jwt = require('jsonwebtoken');

// Configuración para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'uniformes_moda_secret_key';
const JWT_EXPIRES = '24h';

// Controlador para gestión de usuarios/empleados
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
      
      if (!idDetalleProcesoActual || !idProcesoSiguiente) {
        return res.status(400).json({ 
          success: false, 
          message: 'El detalle del proceso actual y el ID del proceso siguiente son obligatorios' 
        });
      }
      
      // Ahora cedulaEmpleadoSiguiente es opcional
      const result = await OrderModel.advanceOrderToNextProcess(
        idDetalleProcesoActual,
        idProcesoSiguiente,
        cedulaEmpleadoSiguiente || null, // Explícitamente enviamos null si no viene
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
  }
};

module.exports = {
  UserController,
  OrderController
};