const bcrypt = require('bcrypt');
const usuarioModel = require('../models/createUsers.model.js');

const crearUsuario = async (req, res) => {
  const {
    cedula, nombre, apellidos, estado = true, id_rol,
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

    await usuarioModel.crearEmpleado({ cedula, nombre, apellidos, estado, id_rol, telefono });

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    await usuarioModel.crearUsuario({ cedula_empleado: cedula, email: emailUsuario, contrasena: hashedPassword });

    res.status(201).json({ mensaje: 'Usuario creado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear usuario' });
  }
};

module.exports = {
  crearUsuario
};
