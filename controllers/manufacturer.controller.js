const ConfeccionistaModel = require('../models/manufacturer.model.js');

const ConfeccionistaController = {
  // Obtener todos los confeccionistas
  getAllConfeccionistas: async (req, res) => {
    try {
      const confeccionistas = await ConfeccionistaModel.getAllConfeccionistas();
      
      res.status(200).json({
        success: true,
        data: confeccionistas,
        message: 'Confeccionistas obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener confeccionistas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener confeccionistas',
        error: error.message
      });
    }
  },
  
  // Obtener un confeccionista específico por ID
  getConfeccionistaById: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El ID del confeccionista es requerido'
        });
      }
      
      const confeccionista = await ConfeccionistaModel.getConfeccionistaById(id);
      
      if (!confeccionista) {
        return res.status(404).json({
          success: false,
          message: `No se encontró confeccionista con ID: ${id}`
        });
      }
      
      res.status(200).json({
        success: true,
        data: confeccionista,
        message: 'Confeccionista obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener confeccionista:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener confeccionista',
        error: error.message
      });
    }
  },
  
  // Obtener todos los productos asignados a un confeccionista
  getProductosByConfeccionista: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El ID del confeccionista es requerido'
        });
      }
      
      // Verificar primero si el confeccionista existe
      const confeccionista = await ConfeccionistaModel.getConfeccionistaById(id);
      
      if (!confeccionista) {
        return res.status(404).json({
          success: false,
          message: `No se encontró confeccionista con ID: ${id}`
        });
      }
      
      const productos = await ConfeccionistaModel.getProductosByConfeccionista(id);
      
      res.status(200).json({
        success: true,
        data: {
          confeccionista,
          productos,
          total_productos: productos.length
        },
        message: productos.length > 0 
          ? 'Productos obtenidos exitosamente' 
          : 'El confeccionista no tiene productos asignados'
      });
    } catch (error) {
      console.error('Error al obtener productos del confeccionista:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos del confeccionista',
        error: error.message
      });
    }
  },
  
  // Obtener resumen de todos los confeccionistas con sus productos
  getAllConfeccionistasWithProducts: async (req, res) => {
    try {
      const confeccionistas = await ConfeccionistaModel.getAllConfeccionistasWithProducts();
      
      res.status(200).json({
        success: true,
        data: confeccionistas,
        message: 'Confeccionistas con productos obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener confeccionistas con productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener confeccionistas con productos',
        error: error.message
      });
    }
  },
  createConfeccionista: async (req, res) => {
    try {
      const { cedula, nombre, telefono, direccion, municipio } = req.body;
      
      // Validaciones adicionales en el controlador
      if (!cedula || isNaN(parseInt(cedula))) {
        return res.status(400).json({
          success: false,
          message: 'La cédula debe ser un número válido'
        });
      }
      
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre no puede estar vacío'
        });
      }
      
      if (!direccion || direccion.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'La dirección no puede estar vacía'
        });
      }
      
      if (!municipio || municipio.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El municipio no puede estar vacío'
        });
      }
      
      // Si se proporciona teléfono, validarlo
      if (telefono !== undefined && telefono !== null && isNaN(parseInt(telefono))) {
        return res.status(400).json({
          success: false,
          message: 'El teléfono debe ser un número válido'
        });
      }
      
      const result = await ConfeccionistaModel.createConfeccionista({
        cedula: parseInt(cedula),
        nombre,
        telefono: telefono ? parseInt(telefono) : null,
        direccion,
        municipio
      });
      
      if (!result.success) {
        if (result.error === 'DUPLICATE_ENTRY') {
          return res.status(409).json(result); // 409 Conflict para duplicados
        }
        return res.status(400).json(result);
      }
      
      res.status(201).json(result); // 201 Created
      
    } catch (error) {
      console.error('Error al crear confeccionista:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el confeccionista',
        error: error.message
      });
    }
  },

  // Actualizar un confeccionista
  updateConfeccionista: async (req, res) => {
    try {
      const { id } = req.params;
      const { cedula, nombre, telefono, direccion, municipio, activo } = req.body;
      
      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: 'El ID del confeccionista debe ser un número válido'
        });
      }
      
      // Validar datos de entrada
      if (cedula !== undefined && cedula !== null && isNaN(parseInt(cedula))) {
        return res.status(400).json({
          success: false,
          message: 'La cédula debe ser un número válido'
        });
      }
      
      if (nombre !== undefined && nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre no puede estar vacío'
        });
      }
      
      if (direccion !== undefined && direccion.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'La dirección no puede estar vacía'
        });
      }
      
      if (municipio !== undefined && municipio.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El municipio no puede estar vacío'
        });
      }
      
      if (telefono !== undefined && telefono !== null && isNaN(parseInt(telefono))) {
        return res.status(400).json({
          success: false,
          message: 'El teléfono debe ser un número válido'
        });
      }
      
      if (activo !== undefined && typeof activo !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'El campo activo debe ser un valor booleano'
        });
      }
      
      // Datos a actualizar
      const datosActualizacion = {
        ...(cedula !== undefined && { cedula: parseInt(cedula) }),
        ...(nombre !== undefined && { nombre }),
        ...(telefono !== undefined && { telefono: telefono ? telefono.toString() : null }),
        ...(direccion !== undefined && { direccion }),
        ...(municipio !== undefined && { municipio }),
        ...(activo !== undefined && { activo })
      };
      
      const result = await ConfeccionistaModel.updateConfeccionista(id, datosActualizacion);
      
      if (!result.success) {
        if (result.error === 'NOT_FOUND') {
          return res.status(404).json(result);
        } else if (result.error === 'DUPLICATE_ENTRY') {
          return res.status(409).json(result);
        } else {
          return res.status(400).json(result);
        }
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Error al actualizar confeccionista:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el confeccionista',
        error: error.message
      });
    }
  },

  // Eliminar un confeccionista
  deleteConfeccionista: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: 'El ID del confeccionista debe ser un número válido'
        });
      }
      
      const result = await ConfeccionistaModel.deleteConfeccionista(id);
      
      if (!result.success) {
        if (result.error === 'NOT_FOUND') {
          return res.status(404).json(result);
        } else {
          return res.status(400).json(result);
        }
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Error al eliminar confeccionista:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el confeccionista',
        error: error.message
      });
    }
  }
};





module.exports = ConfeccionistaController;