const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Ruta para registrar usuario
router.post('/register', register);

// Ruta para login de usuario
router.post('/login', login);

module.exports = router;
