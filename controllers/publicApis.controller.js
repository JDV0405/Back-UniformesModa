const publicApisModel = require('../models/publicapis.models.js');

// Consultar datos del cliente
const consultarCliente = async (req, res) => {
  try {
    const { id_cliente } = req.params;
    
    if (!id_cliente) {
      return res.status(400).json({ 
        error: 'ID del cliente es requerido' 
      });
    }

    const cliente = await publicApisModel.obtenerDatosCliente(id_cliente);
    
    if (!cliente) {
      return res.status(404).json({ 
        error: 'Cliente no encontrado' 
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error('Error al consultar cliente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener productos por categoría
const obtenerProductosPorCategoria = async (req, res) => {
  try {
    const { id_categoria } = req.params;
    const { activo = true } = req.query;
    
    if (!id_categoria) {
      return res.status(400).json({ 
        error: 'ID de categoría es requerido' 
      });
    }

    const productos = await publicApisModel.obtenerProductosPorCategoria(id_categoria, activo);
    
    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener todas las categorías
const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await publicApisModel.obtenerCategorias();
    
    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener productos más vendidos
const obtenerProductosMasVendidos = async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    const productos = await publicApisModel.obtenerProductosMasVendidos(limite);
    
    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener colores disponibles
const obtenerColores = async (req, res) => {
  try {
    const colores = await publicApisModel.obtenerColores();
    
    res.json({
      success: true,
      data: colores
    });
  } catch (error) {
    console.error('Error al obtener colores:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener estampados disponibles
const obtenerEstampados = async (req, res) => {
  try {
    const estampados = await publicApisModel.obtenerEstampados();
    
    res.json({
      success: true,
      data: estampados
    });
  } catch (error) {
    console.error('Error al obtener estampados:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener departamentos
const obtenerDepartamentos = async (req, res) => {
  try {
    const departamentos = await publicApisModel.obtenerDepartamentos();
    
    res.json({
      success: true,
      data: departamentos
    });
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener ciudades por departamento
const obtenerCiudadesPorDepartamento = async (req, res) => {
  try {
    const { id_departamento } = req.params;
    
    if (!id_departamento) {
      return res.status(400).json({ 
        error: 'ID del departamento es requerido' 
      });
    }

    const ciudades = await publicApisModel.obtenerCiudadesPorDepartamento(id_departamento);
    
    res.json({
      success: true,
      data: ciudades
    });
  } catch (error) {
    console.error('Error al obtener ciudades por departamento:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener estadísticas de valoraciones
const obtenerEstadisticasValoraciones = async (req, res) => {
  try {
    const estadisticas = await publicApisModel.obtenerEstadisticasValoraciones();
    
    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de valoraciones:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener órdenes por cliente
const obtenerOrdenesPorCliente = async (req, res) => {
  try {
    const { id_cliente } = req.params;
    const { estado } = req.query;
    
    if (!id_cliente) {
      return res.status(400).json({ 
        error: 'ID del cliente es requerido' 
      });
    }

    const ordenes = await publicApisModel.obtenerOrdenesPorCliente(id_cliente, estado);
    
    res.json({
      success: true,
      data: ordenes
    });
  } catch (error) {
    console.error('Error al obtener órdenes por cliente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener detalles completos de un producto
const obtenerDetalleProducto = async (req, res) => {
  try {
    const { id_producto } = req.params;
    
    if (!id_producto) {
      return res.status(400).json({ 
        error: 'ID del producto es requerido' 
      });
    }

    const producto = await publicApisModel.obtenerDetalleProducto(id_producto);
    
    if (!producto) {
      return res.status(404).json({ 
        error: 'Producto no encontrado' 
      });
    }

    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error('Error al obtener detalle del producto:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Buscar productos por término de búsqueda
const buscarProductos = async (req, res) => {
  try {
    const { q: termino_busqueda } = req.query;
    const { limite = 20 } = req.query;
    
    if (!termino_busqueda) {
      return res.status(400).json({ 
        error: 'Término de búsqueda es requerido' 
      });
    }

    const productos = await publicApisModel.buscarProductos(termino_busqueda, limite);
    
    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al buscar productos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener estado de una orden específica
const obtenerEstadoOrden = async (req, res) => {
  try {
    const { id_orden } = req.params;
    
    if (!id_orden) {
      return res.status(400).json({ 
        error: 'ID de la orden es requerido' 
      });
    }

    const orden = await publicApisModel.obtenerEstadoOrden(id_orden);
    
    if (!orden) {
      return res.status(404).json({ 
        error: 'Orden no encontrada' 
      });
    }

    res.json({
      success: true,
      data: orden
    });
  } catch (error) {
    console.error('Error al obtener estado de la orden:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener valoraciones de productos
const obtenerValoracionesProductos = async (req, res) => {
  try {
    const { limite = 20 } = req.query;
    
    const valoraciones = await publicApisModel.obtenerValoracionesProductos(limite);
    
    res.json({
      success: true,
      data: valoraciones
    });
  } catch (error) {
    console.error('Error al obtener valoraciones de productos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener resumen de órdenes por estado
const obtenerResumenOrdenesPorEstado = async (req, res) => {
  try {
    const resumen = await publicApisModel.obtenerResumenOrdenesPorEstado();
    
    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen de órdenes por estado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener categorías con más productos vendidos
const obtenerCategoriasMasVendidas = async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    const categorias = await publicApisModel.obtenerCategoriasMasVendidas(limite);
    
    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('Error al obtener categorías más vendidas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener órdenes recientes
const obtenerOrdenesRecientes = async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    const ordenes = await publicApisModel.obtenerOrdenesRecientes(limite);
    
    res.json({
      success: true,
      data: ordenes
    });
  } catch (error) {
    console.error('Error al obtener órdenes recientes:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

module.exports = {
  consultarCliente,
  obtenerProductosPorCategoria,
  obtenerCategorias,
  obtenerProductosMasVendidos,
  obtenerColores,
  obtenerEstampados,
  obtenerDepartamentos,
  obtenerCiudadesPorDepartamento,
  obtenerEstadisticasValoraciones,
  obtenerOrdenesPorCliente,
  obtenerDetalleProducto,
  buscarProductos,
  obtenerEstadoOrden,
  obtenerValoracionesProductos,
  obtenerResumenOrdenesPorEstado,
  obtenerCategoriasMasVendidas,
  obtenerOrdenesRecientes
};
