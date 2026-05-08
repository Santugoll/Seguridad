const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { generarReportePDF } = require('../controllers/documentController');

const {
  createDocument,
  getDocuments,
  approveDocument,
  rejectDocument,
  deleteDocument,
  getAuditTrail,
  updateDocument // ✅ Agrégalo aquí
} = require('../controllers/documentController');

const auth = require('../middleware/authMiddleware');

// Configurar Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Subir archivo con descripción
router.post('/', auth, upload.single('file'), createDocument);

// Resto de rutas
router.get('/', auth, getDocuments);
router.put('/approve/:id', auth, approveDocument);
router.put('/reject/:id', auth, rejectDocument);
router.delete('/:id', auth, deleteDocument);
router.post('/', auth, upload.single('file'), createDocument);
router.get('/audit/all', auth, getAuditTrail);
router.get('/reporte', generarReportePDF);
router.put('/:id', auth, updateDocument);


module.exports = router;


