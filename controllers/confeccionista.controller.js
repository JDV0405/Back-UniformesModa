const ConfeccionistaModel = require('../models/confeccionista.model.js');

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
  }
};

module.exports = ConfeccionistaController;