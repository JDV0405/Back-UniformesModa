const bcrypt = require('bcrypt');
const usuarioModel = require('../models/createUsers.model.js');

const crearUsuario = async (req, res) => {
  const {
    cedula, nombre, apellidos, activo = true, id_rol,
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

    await usuarioModel.crearEmpleado({ cedula, nombre, apellidos, activo, id_rol, telefono });

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
    nombre, apellidos, activo, id_rol, telefono, emailUsuario, contrasena
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

    // Actualizar datos del usuario (incluyendo sincronización del campo activo)
    await usuarioModel.actualizarUsuario({
      cedula,
      nombre,
      apellidos,
      activo,
      id_rol,
      telefono,
      email: emailUsuario
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

module.exports = {
  crearUsuario,
  obtenerTodosLosUsuarios,
  editarUsuario
};
