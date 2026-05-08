const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();
const User = require('./models/user'); // ajusta la ruta si es necesario
const bcrypt = require('bcryptjs');
async function crearUsuarioEjemplo() {
  try {
    const existe = await User.findOne({ email: 'auditor@sigd.com' });
    if (!existe) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await User.create({
        name: 'Auditor Ejemplo',
        email: 'auditor@sigd.com',
        password: hashedPassword,
        role: 'auditor'
      });
      console.log('✅ Usuario de ejemplo creado: auditor@sigd.com / 123456');
    } else {
      console.log('ℹ️ Usuario de ejemplo ya existe');
    }
  } catch (err) {
    console.error('Error al crear usuario de ejemplo:', err.message);
  }
}

// Llamar la función al iniciar
crearUsuarioEjemplo();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

// Conectar base de datos
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);  // ⚡ Esta línea conecta los documentos
app.use('/uploads', express.static('uploads'));
app.use('/api/users', require('./routes/userRoutes'));



// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
