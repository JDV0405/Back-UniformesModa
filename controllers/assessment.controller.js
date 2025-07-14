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
};

module.exports = ValoracionController;