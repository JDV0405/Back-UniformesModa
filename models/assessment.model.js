const pool = require('../database/db.js');

const ValoracionModel = {
  // Crear una nueva valoración para una orden
  crearValoracion: async (data) => {
    try {
      // Verificar si la orden existe
      const ordenExiste = await pool.query(
        'SELECT id_orden FROM orden_produccion WHERE id_orden = $1',
        [data.id_orden_produccion]
      );
      
      if (ordenExiste.rows.length === 0) {
        return { 
          success: false, 
          message: 'La orden especificada no existe' 
        };
      }
      
      // Verificar si ya existe una valoración para esta orden
      const valoracionExistente = await pool.query(
        'SELECT id_valoracion FROM valoracion WHERE id_orden_produccion = $1',
        [data.id_orden_produccion]
      );
      
      if (valoracionExistente.rows.length > 0) {
        return {
          success: false,
          message: 'Ya existe una valoración para esta orden',
          id_valoracion: valoracionExistente.rows[0].id_valoracion
        };
      }
      
      // Insertar la nueva valoración
      const result = await pool.query(
        `INSERT INTO valoracion (id_orden_produccion, estrellas, comentario) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [data.id_orden_produccion, data.estrellas, data.comentario || null]
      );
      
      return {
        success: true,
        message: 'Valoración creada correctamente',
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error al crear valoración:', error);
      throw new Error(`Error al crear valoración: ${error.message}`);
    }
  },
  
  // Obtener todas las valoraciones
  obtenerTodasValoraciones: async () => {
    try {
      const result = await pool.query(
        `SELECT v.*, op.id_cliente, c.nombre as cliente_nombre
         FROM valoracion v
         JOIN orden_produccion op ON v.id_orden_produccion = op.id_orden
         JOIN cliente c ON op.id_cliente = c.id_cliente
         ORDER BY v.fecha_valoracion DESC`
      );
      
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener todas las valoraciones: ${error.message}`);
    }
  },
};

module.exports = ValoracionModel;