const ValoracionModel = require('../models/assessment.model.js');

const ValoracionController = {
  // Crear una nueva valoración
  crearValoracion: async (req, res) => {
    try {
      const { id_orden_produccion, estrellas, comentario } = req.body;
      
      // Validar que se proporcionaron los campos requeridos
      if (!id_orden_produccion || !estrellas) {
        return res.status(400).json({
          success: false,
          message: 'El ID de la orden y las estrellas son campos requeridos'
        });
      }
      
      // Validar el rango de estrellas
      if (estrellas < 1 || estrellas > 5 || !Number.isInteger(Number(estrellas))) {
        return res.status(400).json({
          success: false,
          message: 'Las estrellas deben ser un número entero entre 1 y 5'
        });
      }
      
      const result = await ValoracionModel.crearValoracion({
        id_orden_produccion,
        estrellas,
        comentario
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error al crear valoración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la valoración',
        error: error.message
      });
    }
  },
  
  // Obtener una valoración por su ID
  obtenerValoracionPorId: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El ID de la valoración es requerido'
        });
      }
      
      const valoracion = await ValoracionModel.obtenerValoracionPorId(id);
      
      if (!valoracion) {
        return res.status(404).json({
          success: false,
          message: 'Valoración no encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        data: valoracion
      });
    } catch (error) {
      console.error('Error al obtener valoración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la valoración',
        error: error.message
      });
    }
  },
  
  // Obtener valoración por ID de orden
  obtenerValoracionPorOrden: async (req, res) => {
    try {
      const { idOrden } = req.params;
      
      if (!idOrden) {
        return res.status(400).json({
          success: false,
          message: 'El ID de la orden es requerido'
        });
      }
      
      const valoracion = await ValoracionModel.obtenerValoracionPorOrden(idOrden);
      
      if (!valoracion) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró valoración para esta orden'
        });
      }
      
      res.status(200).json({
        success: true,
        data: valoracion
      });
    } catch (error) {
      console.error('Error al obtener valoración por orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la valoración',
        error: error.message
      });
    }
  },
  
  // Obtener todas las valoraciones
  obtenerTodasValoraciones: async (req, res) => {
    try {
      const valoraciones = await ValoracionModel.obtenerTodasValoraciones();
      
      res.status(200).json({
        success: true,
        data: valoraciones
      });
    } catch (error) {
      console.error('Error al obtener todas las valoraciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las valoraciones',
        error: error.message
      });
    }
  },
  
  // Actualizar una valoración
  actualizarValoracion: async (req, res) => {
    try {
      const { id } = req.params;
      const { estrellas, comentario } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El ID de la valoración es requerido'
        });
      }
      
      if (!estrellas) {
        return res.status(400).json({
          success: false,
          message: 'Las estrellas son requeridas'
        });
      }
      
      // Validar el rango de estrellas
      if (estrellas < 1 || estrellas > 5 || !Number.isInteger(Number(estrellas))) {
        return res.status(400).json({
          success: false,
          message: 'Las estrellas deben ser un número entero entre 1 y 5'
        });
      }
      
      const result = await ValoracionModel.actualizarValoracion(id, {
        estrellas,
        comentario
      });
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al actualizar valoración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la valoración',
        error: error.message
      });
    }
  },
  
  // Eliminar una valoración
  eliminarValoracion: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El ID de la valoración es requerido'
        });
      }
      
      const result = await ValoracionModel.eliminarValoracion(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al eliminar valoración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la valoración',
        error: error.message
      });
    }
  },
  
  // Obtener estadísticas de valoraciones
  obtenerEstadisticas: async (req, res) => {
    try {
      const estadisticas = await ValoracionModel.obtenerEstadisticas();
      
      res.status(200).json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas',
        error: error.message
      });
    }
  }
};

module.exports = ValoracionController;