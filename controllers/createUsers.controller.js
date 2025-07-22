const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/createUsers.model.js');

const crearUsuario = async (req, res) => {
  const {
    cedula, nombre, apellidos, activo = true, roles = [],
    telefono, emailUsuario, contrasena
  } = req.body;

  try {
    const empleadoExistente = await usuarioModel.buscarEmpleadoPorCedula(cedula);
    if (empleadoExistente) {
      return res.status(400).json({ mensaje: 'Empleado ya existe' });
    }

    const usuarioExistente = await usuarioModel.buscarUsuarioPorEmail(emailUsuario);
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'Correo ya está en uso' });
    }

    // Validar que se proporcionen roles
    if (!roles || roles.length === 0) {
      return res.status(400).json({ mensaje: 'Debe asignar al menos un rol al empleado' });
    }

    await usuarioModel.crearEmpleado({ cedula, nombre, apellidos, activo, telefono });

    // Asignar roles al empleado
    await usuarioModel.asignarRolesEmpleado({ cedula_empleado: cedula, roles });

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    await usuarioModel.crearUsuario({ cedula_empleado: cedula, email: emailUsuario, contrasena: hashedPassword });

    res.status(201).json({ mensaje: 'Usuario creado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear usuario' });
  }
};

const obtenerTodosLosUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioModel.obtenerTodosLosUsuarios();
    res.status(200).json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
};

const editarUsuario = async (req, res) => {
  const { cedula } = req.params;
  const {
    nombre, apellidos, activo, roles = [], telefono, emailUsuario, contrasena
  } = req.body;

  try {
    const empleadoExistente = await usuarioModel.buscarEmpleadoPorCedula(cedula);
    if (!empleadoExistente) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Verificar si el email ya está en uso por otro usuario
    const usuarioConEmail = await usuarioModel.buscarUsuarioPorEmail(emailUsuario);
    if (usuarioConEmail && usuarioConEmail.cedula_empleado !== cedula) {
      return res.status(400).json({ mensaje: 'El correo ya está en uso por otro usuario' });
    }

    // Validar que se proporcionen roles
    if (!roles || roles.length === 0) {
      return res.status(400).json({ mensaje: 'Debe asignar al menos un rol al empleado' });
    }

    // Actualizar datos del usuario (incluyendo sincronización del campo activo)
    await usuarioModel.actualizarUsuario({
      cedula,
      nombre,
      apellidos,
      activo,
      telefono,
      email: emailUsuario,
      roles
    });

    // Si se proporciona una nueva contraseña, actualizarla
    if (contrasena && contrasena.trim() !== '') {
      const hashedPassword = await bcrypt.hash(contrasena, 10);
      await usuarioModel.actualizarContrasenaUsuario({ cedula, contrasena: hashedPassword });
    }

    res.status(200).json({ mensaje: 'Usuario actualizado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
};

const obtenerTodosLosRoles = async (req, res) => {
  try {
    const roles = await usuarioModel.obtenerTodosLosRoles();
    res.status(200).json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener roles' });
  }
};

// Obtener perfil completo de usuario
const obtenerPerfilUsuario = async (req, res) => {
  try {
    const { cedula } = req.params;
    
    if (!cedula) {
      return res.status(400).json({ mensaje: 'Cédula es requerida' });
    }

    const perfil = await usuarioModel.obtenerPerfilUsuario(cedula);
    
    if (!perfil) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Estructurar la respuesta con toda la información solicitada
    const perfilCompleto = {
      // Datos del usuario
      datos_usuario: {
        email: perfil.email,
        estado_cuenta: perfil.usuario_activo ? 'Activo' : 'Inactivo'
      },
      
      // Datos del empleado
      datos_empleado: {
        cedula: perfil.cedula,
        nombre: perfil.nombre,
        apellidos: perfil.apellidos,
        telefono: perfil.telefono,
        estado: perfil.empleado_activo ? 'Activo' : 'Inactivo'
      },
      
      // Roles asignados
      roles_asignados: perfil.roles || [],
      
      // Estadísticas de participación
      estadisticas_participacion: {
        cantidad_procesos_participados: parseInt(perfil.total_procesos_participados) || 0,
        ultima_participacion_proceso: perfil.ultima_participacion_proceso,
        cantidad_ordenes_responsable: parseInt(perfil.total_ordenes_responsable) || 0,
        total_acciones_historial: parseInt(perfil.total_acciones_historial) || 0,
        ultima_accion_registrada: perfil.ultima_accion_registrada
      }
    };

    res.status(200).json({
      success: true,
      data: perfilCompleto
    });
  } catch (err) {
    console.error('Error al obtener perfil de usuario:', err);
    res.status(500).json({ mensaje: 'Error al obtener perfil de usuario' });
  }
};

// Obtener solo estadísticas del usuario
const obtenerEstadisticasUsuario = async (req, res) => {
  try {
    const { cedula } = req.params;
    
    if (!cedula) {
      return res.status(400).json({ mensaje: 'Cédula es requerida' });
    }

    const estadisticas = await usuarioModel.obtenerEstadisticasUsuario(cedula);
    
    res.status(200).json({
      success: true,
      data: estadisticas
    });
  } catch (err) {
    console.error('Error al obtener estadísticas de usuario:', err);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas de usuario' });
  }
};

// Obtener órdenes recientes del usuario
const obtenerOrdenesRecientesUsuario = async (req, res) => {
  try {
    const { cedula } = req.params;
    const { limite = 10 } = req.query;
    
    if (!cedula) {
      return res.status(400).json({ mensaje: 'Cédula es requerida' });
    }

    const ordenes = await usuarioModel.obtenerOrdenesRecientesUsuario(cedula, limite);
    
    res.status(200).json({
      success: true,
      data: ordenes
    });
  } catch (err) {
    console.error('Error al obtener órdenes recientes de usuario:', err);
    res.status(500).json({ mensaje: 'Error al obtener órdenes recientes de usuario' });
  }
};

// Obtener historial de actividades del usuario
const obtenerHistorialActividadesUsuario = async (req, res) => {
  try {
    const { cedula } = req.params;
    const { limite = 20 } = req.query;
    
    if (!cedula) {
      return res.status(400).json({ mensaje: 'Cédula es requerida' });
    }

    const historial = await usuarioModel.obtenerHistorialActividadesUsuario(cedula, limite);
    
    res.status(200).json({
      success: true,
      data: historial
    });
  } catch (err) {
    console.error('Error al obtener historial de actividades de usuario:', err);
    res.status(500).json({ mensaje: 'Error al obtener historial de actividades de usuario' });
  }
};

// Obtener estadísticas específicas por rol
const obtenerEstadisticasEspecificasPorRol = async (req, res) => {
  try {
    const { cedula, id_rol } = req.params;
    
    if (!cedula || !id_rol) {
      return res.status(400).json({ mensaje: 'Cédula e ID de rol son requeridos' });
    }

    const estadisticas = await usuarioModel.obtenerEstadisticasEspecificasPorRol(cedula, id_rol);
    
    res.status(200).json({
      success: true,
      data: estadisticas
    });
  } catch (err) {
    console.error('Error al obtener estadísticas específicas por rol:', err);
    res.status(500).json({ mensaje: err.message || 'Error al obtener estadísticas específicas por rol' });
  }
};

module.exports = {
  crearUsuario,
  obtenerTodosLosUsuarios,
  obtenerTodosLosRoles,
  editarUsuario,
  obtenerPerfilUsuario,
  obtenerEstadisticasUsuario,
  obtenerOrdenesRecientesUsuario,
  obtenerHistorialActividadesUsuario,
  obtenerEstadisticasEspecificasPorRol
};
