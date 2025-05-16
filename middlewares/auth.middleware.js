const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'uniformes_moda_secret_key';

module.exports = (req, res, next) => {
  try {
    // Obtener el token del encabezado
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token no proporcionado o formato inválido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Agregar datos del usuario al objeto request
    req.userId = decoded.id;
    req.rol = decoded.rol;
    req.cedula = decoded.cedula;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: error.message
    });
  }
};