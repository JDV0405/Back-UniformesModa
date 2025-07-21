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

    const estadisticas = await usuarioModel.obtenerEstadisticasUsuario(cedula);

    const perfilCompleto = {
      informacion_personal: perfil,
      estadisticas: estadisticas,
      ordenes_recientes: ordenesRecientes,
      procesos_recientes: procesosRecientes,
      historial_actividades: historialActividades
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






module.exports = {
  crearUsuario,
  obtenerTodosLosUsuarios,
  obtenerTodosLosRoles,
  editarUsuario,
  obtenerPerfilUsuario,
};
