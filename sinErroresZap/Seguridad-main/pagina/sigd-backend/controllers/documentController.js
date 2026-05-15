const Document = require('../models/Document');
const PDFDocument = require('pdfkit');

// Crear nuevo documento
const createDocument = async (req, res) => {
  try {
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const { title, description } = req.body;
    const file = req.file ? req.file.filename : null;

    const document = new Document({
      title,
      description,
      file,
      user: req.user.id
    });

    await document.save();
    res.status(201).json({ message: 'Documento creado exitosamente', document });
  } catch (error) {
    console.error('Error al guardar en MongoDB:', error.message);
    res.status(500).json({ message: 'Error al guardar documento en la base de datos' });
  }
};

// Obtener todos los documentos (con filtro opcional por estado)
const getDocuments = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    const documents = await Document.find(query).populate('user', 'name email');
    res.json(documents);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error en el servidor');
  }
};

// Aprobar documento
const approveDocument = async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Aprobado',
        approvedBy: req.user.id,
        approvedAt: Date.now()
      },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error al aprobar documento');
  }
};

// Rechazar documento
const rejectDocument = async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Rechazado',
        approvedBy: req.user.id,
        approvedAt: Date.now()
      },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error al rechazar documento');
  }
};

// Eliminar documento
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json({ message: 'Documento eliminado' });
  } catch (err) {
    res.status(500).send('Error al eliminar');
  }
};

// Obtener historial de auditoría
const getAuditTrail = async (req, res) => {
  try {
    const docs = await Document.find()
      .populate('user', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    res.status(500).send('Error al obtener auditoría');
  }
};

// Generar reporte PDF
const generarReportePDF = async (req, res) => {
  try {
    const documentos = await Document.find()
      .populate('user', 'name email')
      .populate('approvedBy', 'name email');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text("Reporte de Documentos", { align: 'center' });
    doc.moveDown();

    documentos.forEach(d => {
      doc.fontSize(12).text(
        `Título: ${d.title}\nDescripción: ${d.description}\nEstado: ${d.status}\nUsuario: ${d.user?.name}\nFecha: ${d.createdAt.toLocaleString()}`,
        { lineGap: 5 }
      );
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error.message);
    res.status(500).send('Error al generar el PDF');
  }
};

const updateDocument = async (req, res) => {
  try {
    const { description } = req.body;
    const updatedDoc = await Document.findByIdAndUpdate(
      req.params.id,
      { description },
      { new: true }
    );
    res.json(updatedDoc);
  } catch (err) {
    console.error('Error actualizando documento:', err.message);
    res.status(500).json({ message: 'Error al actualizar documento' });
  }
};


// Exportar todo
module.exports = {
  createDocument,
  getDocuments,
  approveDocument,
  rejectDocument,
  deleteDocument,
  getAuditTrail,
  generarReportePDF,
  updateDocument // ✅ Añade esto
};

