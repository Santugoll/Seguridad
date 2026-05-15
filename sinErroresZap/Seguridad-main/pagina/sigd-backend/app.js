const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/user');
const bcrypt = require('bcryptjs');

// ==============================
// CREAR USUARIO DE EJEMPLO
// ==============================
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
      console.log('✅ Usuario de ejemplo creado');
    } else {
      console.log('ℹ️ Usuario de ejemplo ya existe');
    }
  } catch (err) {
    console.error('Error al crear usuario:', err.message);
  }
}

crearUsuarioEjemplo();

// ==============================
// IMPORTAR RUTAS
// ==============================
const authRoutes     = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
app.disable('x-powered-by');

// ==============================
// CONECTAR BASE DE DATOS
// ==============================
connectDB();

// ==============================
// CORS
// ==============================
const corsOptions = {
  origin: ['http://localhost:5000'],
  credentials: true
};
app.use(cors(corsOptions));

// ==============================
// MIDDLEWARES
// ==============================
app.use(express.json());

// ==============================
// CSP — sin unsafe-inline en script-src ni style-src
// script.js y styles.css son archivos externos en 'self',
// y todos los handlers están en addEventListener (no onclick inline)
// ==============================
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://cdn.quilljs.com",
  "style-src 'self' https://cdn.quilljs.com",
  "img-src 'self' data:",
  "font-src 'self' https://cdn.quilljs.com",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

// ==============================
// HEADERS DE SEGURIDAD
// ==============================
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  next();
});

// ==============================
// ARCHIVOS ESTÁTICOS
// ==============================
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/uploads', express.static('uploads'));

// ==============================
// RUTA PRINCIPAL
// ==============================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ==============================
// RUTAS API
// ==============================
app.use('/api/auth',      authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users',     require('./routes/userRoutes'));

// ==============================
// MANEJO DE RUTAS NO ENCONTRADAS (404)
// ==============================
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>404 - Página no encontrada</title>
    </head>
    <body>
      <h1>404 - Página no encontrada</h1>
    </body>
    </html>
  `);
});

// ==============================
// INICIAR SERVIDOR
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
