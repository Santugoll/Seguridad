const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
// const checkRole = require('../middleware/roleMiddleware'); // puedes activar luego

const { register } = require('../controllers/authController');
const { getUsers, updateUserRole, updateUser } = require('../controllers/userController');

// Crear usuario desde el panel
router.post('/', auth, /* checkRole('admin'), */ register);

// Obtener usuarios
router.get('/', auth, /* checkRole('admin'), */ getUsers);

// Cambiar rol
router.put('/:id/role', auth, /* checkRole('admin'), */ updateUserRole);

// Editar usuario completo (nombre, correo, contraseña, rol)
router.put('/:id', auth, /* checkRole('admin'), */ updateUser);

module.exports = router;
