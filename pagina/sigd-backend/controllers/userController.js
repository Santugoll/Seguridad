const User = require('../models/User');

// Obtener todos los usuarios (solo campos relevantes)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'name email role');
    res.json(users);
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Actualizar rol de un usuario
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error al actualizar rol:', err.message);
    res.status(500).json({ message: 'Error al actualizar rol del usuario' });
  }
};

const bcrypt = require('bcryptjs');

const updateUser = async (req, res) => {
  try {
    const updates = req.body;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error al editar usuario:', err.message);
    res.status(500).json({ message: 'Error al editar usuario' });
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  updateUser
};
