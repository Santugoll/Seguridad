const API_URL = 'http://localhost:5000/api';
let token = '';
let activeView = 'todos';
let editingQuill;
let currentDocumentId = null;

// ==============================
// REFERENCIAS DOM
// ==============================
const loginSection   = document.getElementById('loginSection');
const mainSection    = document.getElementById('mainSection');
const documentsTable = document.getElementById('documentsTable');
const fileForm       = document.getElementById('fileForm');
const manualForm     = document.getElementById('manualForm');
const uploadDropdown = document.getElementById('uploadDropdown');
const userAdminTitle   = document.getElementById('userAdminTitle');
const userAdminSection = document.getElementById('userAdminSection');
const usersTable     = document.getElementById('usersTable');
const newUserForm    = document.getElementById('newUserForm');

// ==============================
// INICIALIZACIÓN
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');

  // Quill editor para creación manual
  window.quill = new Quill('#editorContainer', { theme: 'snow' });

  // Botones del sidebar (antes tenían onclick="..." inline)
  document.getElementById('uploadBtn').addEventListener('click', () => {
    uploadDropdown.style.display = uploadDropdown.style.display === 'block' ? 'none' : 'block';
  });

  document.getElementById('btnSubirArchivo').addEventListener('click', openUploadForm);
  document.getElementById('btnCrearManual').addEventListener('click', openManualForm);
  document.getElementById('btnVerDocumentos').addEventListener('click', loadDocuments);
  document.getElementById('btnReview').addEventListener('click', loadReviewSection);
  document.getElementById('btnAudit').addEventListener('click', loadAudit);
  document.getElementById('btnUserAdmin').addEventListener('click', loadUserAdmin);
  document.getElementById('btnCerrarSesion').addEventListener('click', logout);

  // Botones del visor (antes tenían onclick="..." inline)
  document.getElementById('btnCerrarViewer').addEventListener('click', closeViewer);
  document.getElementById('editBtn').addEventListener('click', enableEditor);
  document.getElementById('btnGuardarCambios').addEventListener('click', saveEditedDocument);

  // Reporte PDF
  document.getElementById('btnGenerarReporte').addEventListener('click', async () => {
    try {
      const storedToken = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/documents/reporte`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      if (!response.ok) throw new Error('Error al generar reporte');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      alert('Hubo un problema al generar el reporte.');
    }
  });
});

// ==============================
// FORMULARIOS DE CARGA
// ==============================
function openUploadForm() {
  fileForm.style.display = 'block';
  manualForm.style.display = 'none';
  uploadDropdown.style.display = 'none';
  documentsTable.style.display = 'none';
}

function openManualForm() {
  manualForm.style.display = 'block';
  fileForm.style.display = 'none';
  uploadDropdown.style.display = 'none';
  documentsTable.style.display = 'none';
}

// ==============================
// LOGIN
// ==============================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res  = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (data.token && data.user) {
    token = data.token;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    const role = data.user.role.trim().toLowerCase();

    if (role === 'auditor') {
      document.getElementById('btnUserAdmin').style.display = 'block';
      document.getElementById('btnReview').style.display = 'block';
      document.getElementById('btnAudit').style.display = 'block';
    } else {
      document.getElementById('btnUserAdmin').style.display = 'none';
      document.getElementById('btnReview').style.display = 'none';
      document.getElementById('btnAudit').style.display = 'none';
    }

    loginSection.style.display = 'none';
    mainSection.style.display = 'flex';
    document.getElementById('aboutSection').style.display = 'block';
  }
});

// ==============================
// CERRAR SESIÓN
// ==============================
function logout() {
  token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  loginSection.style.display = 'block';
  mainSection.style.display = 'none';
  document.getElementById('btnUserAdmin').style.display = 'none';
}

// ==============================
// SUBIR ARCHIVO
// ==============================
fileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title    = document.getElementById('titleFile').value;
  const file     = document.getElementById('fileUpload').files[0];
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', '');
  formData.append('file', file);

  const res = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  if (res.ok) {
    alert('Archivo subido');
    fileForm.reset();
    fileForm.style.display = 'none';
    loadDocuments();
  } else {
    alert('Error al subir archivo');
  }
});

// ==============================
// CREAR DOCUMENTO MANUAL
// ==============================
manualForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title       = document.getElementById('titleManual').value;
  const description = window.quill.root.innerHTML;

  const res = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title, description })
  });

  if (res.ok) {
    alert('Documento creado');
    manualForm.reset();
    window.quill.setContents([]);
    manualForm.style.display = 'none';
    loadDocuments();
  } else {
    alert('Error al crear documento');
  }
});

// ==============================
// CARGAR DOCUMENTOS
// ==============================
async function loadDocuments() {
  activeView = 'todos';
  hideAllSections();

  const res = await fetch(`${API_URL}/documents`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const documents = await res.json();
  const tbody = documentsTable.querySelector('tbody');
  tbody.innerHTML = '';
  documentsTable.style.display = 'table';

  documents.forEach(doc => {
    const row = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = doc.title;
    name.style.color = 'blue';
    name.style.cursor = 'pointer';
    name.addEventListener('click', () => {
      if (doc.file) window.open(`http://localhost:5000/uploads/${doc.file}`, '_blank');
      else showDocument(doc.title, doc.description, doc._id);
    });

    const date = document.createElement('td');
    date.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');

    const status = document.createElement('td');
    status.textContent = doc.status;

    const options = document.createElement('td');
    options.classList.add('options');
    options.textContent = '⋮';

    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown');

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', () => deleteDocument(doc._id));

    dropdown.appendChild(deleteBtn);
    options.appendChild(dropdown);
    options.addEventListener('click', () => {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    row.appendChild(name);
    row.appendChild(date);
    row.appendChild(status);
    row.appendChild(options);
    tbody.appendChild(row);
  });
}

// ==============================
// ELIMINAR DOCUMENTO
// ==============================
async function deleteDocument(id) {
  if (!confirm('¿Eliminar este documento?')) return;

  const res = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    alert('Documento eliminado');
    loadDocuments();
  } else {
    alert('Error al eliminar');
  }
}

// ==============================
// REVISIÓN Y APROBACIÓN
// ==============================
async function loadReviewSection() {
  activeView = 'revision';
  hideAllSections();
  document.getElementById('reviewTitle').style.display = 'block';
  document.getElementById('reviewTable').style.display = 'table';

  const res = await fetch(`${API_URL}/documents?status=Pendiente`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const documents = await res.json();
  const tbody = document.querySelector('#reviewTable tbody');
  tbody.innerHTML = '';
  documents.forEach(doc => renderReviewRow(doc, tbody));
}

async function updateStatus(id, newStatus) {
  const action = newStatus === 'Aprobado' ? 'approve' : 'reject';

  const res = await fetch(`${API_URL}/documents/${action}/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    alert(`Documento ${newStatus.toLowerCase()} correctamente`);
    loadReviewSection();
  } else {
    alert('Error al actualizar estado');
  }
}

// ==============================
// AUDITORÍA
// ==============================
async function loadAudit() {
  activeView = 'auditoria';
  hideAllSections();
  document.getElementById('auditTitle').style.display = 'block';
  document.getElementById('auditTable').style.display = 'table';

  const res = await fetch(`${API_URL}/documents/audit/all`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const docs  = await res.json();
  const tbody = document.querySelector('#auditTable tbody');
  tbody.innerHTML = '';
  docs.forEach(doc => renderAuditRow(doc, tbody));
}

// ==============================
// VISOR DE DOCUMENTOS
// ==============================
function showDocument(title, htmlContent, id = null) {
  document.getElementById('viewerTitle').innerText = title;
  document.getElementById('viewerContent').innerHTML = htmlContent;
  currentDocumentId = id;

  hideAllSections();
  document.getElementById('documentViewer').style.display  = 'block';
  document.getElementById('viewerContent').style.display   = 'block';
  document.getElementById('editBtn').style.display         = 'inline-block';
  document.getElementById('editorView').style.display      = 'none';
}

function closeViewer() {
  document.getElementById('documentViewer').style.display = 'none';
  loadDocuments();
}

function enableEditor() {
  const contentHTML = document.getElementById('viewerContent').innerHTML;
  document.getElementById('viewerContent').style.display = 'none';
  document.getElementById('editBtn').style.display       = 'none';
  document.getElementById('editorView').style.display    = 'block';

  if (!editingQuill) {
    editingQuill = new Quill('#editorArea', { theme: 'snow' });
  }
  editingQuill.root.innerHTML = contentHTML;
}

async function saveEditedDocument() {
  const updatedHTML = editingQuill.root.innerHTML;

  const res = await fetch(`${API_URL}/documents/${currentDocumentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ description: updatedHTML })
  });

  if (res.ok) {
    alert('Cambios guardados');
    showDocument(document.getElementById('viewerTitle').innerText, updatedHTML, currentDocumentId);
  } else {
    alert('Error al guardar los cambios');
  }
}

// ==============================
// OCULTAR SECCIONES
// ==============================
function hideAllSections() {
  fileForm.style.display = 'none';
  manualForm.style.display = 'none';
  documentsTable.style.display = 'none';
  document.getElementById('reviewTitle').style.display   = 'none';
  document.getElementById('reviewTable').style.display   = 'none';
  document.getElementById('aboutSection').style.display  = 'none';
  document.getElementById('auditTitle').style.display    = 'none';
  document.getElementById('auditTable').style.display    = 'none';
  document.getElementById('documentViewer').style.display = 'none';
  userAdminTitle.style.display   = 'none';
  userAdminSection.style.display = 'none';
}

// ==============================
// BÚSQUEDA AVANZADA
// ==============================
document.getElementById('searchInput').addEventListener('input', async function () {
  const query = this.value.toLowerCase();
  hideAllSections();

  let documents = [];

  if (activeView === 'todos') {
    const res = await fetch(`${API_URL}/documents`, { headers: { Authorization: `Bearer ${token}` } });
    documents = await res.json();
    documentsTable.style.display = 'table';
  } else if (activeView === 'revision') {
    const res = await fetch(`${API_URL}/documents?status=Pendiente`, { headers: { Authorization: `Bearer ${token}` } });
    documents = await res.json();
    document.getElementById('reviewTitle').style.display = 'block';
    document.getElementById('reviewTable').style.display = 'table';
  } else if (activeView === 'auditoria') {
    const res = await fetch(`${API_URL}/documents/audit/all`, { headers: { Authorization: `Bearer ${token}` } });
    documents = await res.json();
    document.getElementById('auditTitle').style.display = 'block';
    document.getElementById('auditTable').style.display = 'table';
  } else if (activeView === 'usuarios') {
    userAdminTitle.style.display   = 'block';
    userAdminSection.style.display = 'block';

    const res   = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
    const users = await res.json();
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );

    const tbody = usersTable.querySelector('tbody');
    tbody.innerHTML = '';
    filtered.forEach(user => {
      const row = document.createElement('tr');
      const nameTd   = document.createElement('td'); nameTd.textContent   = user.name;
      const emailTd  = document.createElement('td'); emailTd.textContent  = user.email;
      const roleTd   = document.createElement('td'); roleTd.textContent   = user.role;
      const actionTd = document.createElement('td');
      const editBtn  = document.createElement('button');
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => showEditForm(user, row));
      actionTd.appendChild(editBtn);
      row.append(nameTd, emailTd, roleTd, actionTd);
      tbody.appendChild(row);
    });
    return;
  }

  const filtered = documents.filter(doc => doc.title.toLowerCase().includes(query));

  if (activeView === 'todos') {
    const tbody = documentsTable.querySelector('tbody');
    tbody.innerHTML = '';
    filtered.forEach(doc => renderDocumentRow(doc, tbody));
  } else if (activeView === 'revision') {
    const tbody = document.querySelector('#reviewTable tbody');
    tbody.innerHTML = '';
    filtered.forEach(doc => renderReviewRow(doc, tbody));
  } else if (activeView === 'auditoria') {
    const tbody = document.querySelector('#auditTable tbody');
    tbody.innerHTML = '';
    filtered.forEach(doc => renderAuditRow(doc, tbody));
  }
});

// ==============================
// ADMINISTRACIÓN DE USUARIOS
// ==============================
async function fetchUsers() {
  const res   = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
  const users = await res.json();

  const tbody = usersTable.querySelector('tbody');
  tbody.innerHTML = '';

  users.forEach(user => {
    const row      = document.createElement('tr');
    const nameTd   = document.createElement('td'); nameTd.textContent   = user.name;
    const emailTd  = document.createElement('td'); emailTd.textContent  = user.email;
    const roleTd   = document.createElement('td'); roleTd.textContent   = user.role;
    const actionTd = document.createElement('td');
    const editBtn  = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => showEditForm(user, row));
    actionTd.appendChild(editBtn);
    row.append(nameTd, emailTd, roleTd, actionTd);
    tbody.appendChild(row);
  });
}

newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name     = document.getElementById('newUserName').value;
  const email    = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  const role     = document.getElementById('newUserRole').value;

  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, email, password, role })
  });

  if (res.ok) {
    alert('Usuario creado');
    newUserForm.reset();
    fetchUsers();
  } else {
    alert('Error al crear usuario');
  }
});

// FIX: antes usaba innerHTML con onclick inline; ahora construye el DOM manualmente
function showEditForm(user, rowElement) {
  // Evitar formularios duplicados
  const existing = rowElement.nextSibling;
  if (existing && existing.classList && existing.classList.contains('editFormRow')) {
    existing.remove();
    return;
  }

  const formRow = document.createElement('tr');
  formRow.classList.add('editFormRow');
  const formTd = document.createElement('td');
  formTd.colSpan = 4;

  // Inputs
  const nameInput = document.createElement('input');
  nameInput.type = 'text'; nameInput.name = 'name'; nameInput.value = user.name;
  nameInput.placeholder = 'Nombre'; nameInput.required = true;

  const emailInput = document.createElement('input');
  emailInput.type = 'email'; emailInput.name = 'email'; emailInput.value = user.email;
  emailInput.placeholder = 'Correo'; emailInput.required = true;

  const passInput = document.createElement('input');
  passInput.type = 'password'; passInput.name = 'password';
  passInput.placeholder = 'Nueva contraseña';

  const roleSelect = document.createElement('select');
  roleSelect.name = 'role';
  ['funcionario', 'contratista', 'auditor'].forEach(r => {
    const opt = document.createElement('option');
    opt.value = r; opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
    if (user.role === r) opt.selected = true;
    roleSelect.appendChild(opt);
  });

  const saveBtn   = document.createElement('button'); saveBtn.type = 'button';   saveBtn.textContent = 'Guardar';
  const cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancelar';

  // Listeners (sin onclick inline)
  cancelBtn.addEventListener('click', () => formRow.remove());
  saveBtn.addEventListener('click', async () => {
    const data = {
      name:  nameInput.value,
      email: emailInput.value,
      role:  roleSelect.value
    };
    if (passInput.value) data.password = passInput.value;

    const res = await fetch(`${API_URL}/users/${user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert('Usuario actualizado');
      formRow.remove();
      fetchUsers();
    } else {
      alert('Error al actualizar usuario');
    }
  });

  formTd.append(nameInput, emailInput, passInput, roleSelect, saveBtn, cancelBtn);
  formRow.appendChild(formTd);
  rowElement.after(formRow);
}

function loadUserAdmin() {
  activeView = 'usuarios';
  hideAllSections();
  userAdminTitle.style.display   = 'block';
  userAdminSection.style.display = 'block';
  fetchUsers();
}

// ==============================
// RENDER HELPERS
// ==============================
function renderDocumentRow(doc, tbody) {
  const row  = document.createElement('tr');
  const name = document.createElement('td');
  name.textContent = doc.title;
  name.style.color  = 'blue';
  name.style.cursor = 'pointer';
  name.addEventListener('click', () => {
    if (doc.file) window.open(`http://localhost:5000/uploads/${doc.file}`, '_blank');
    else showDocument(doc.title, doc.description, doc._id);
  });

  const date   = document.createElement('td');
  date.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');

  const status = document.createElement('td');
  status.textContent = doc.status;

  const options  = document.createElement('td');
  options.classList.add('options');
  options.textContent = '⋮';

  const dropdown = document.createElement('div');
  dropdown.classList.add('dropdown');
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', () => deleteDocument(doc._id));
  dropdown.appendChild(deleteBtn);
  options.appendChild(dropdown);
  options.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });

  row.append(name, date, status, options);
  tbody.appendChild(row);
}

function renderReviewRow(doc, tbody) {
  const row    = document.createElement('tr');
  const name   = document.createElement('td'); name.textContent = doc.title;
  const date   = document.createElement('td'); date.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');
  const desc   = document.createElement('td'); desc.textContent = doc.description || '[archivo adjunto]';
  const actions = document.createElement('td');

  const approveBtn = document.createElement('button');
  approveBtn.textContent = '✅ Aprobar';
  approveBtn.addEventListener('click', () => updateStatus(doc._id, 'Aprobado'));

  const rejectBtn = document.createElement('button');
  rejectBtn.textContent = '❌ Rechazar';
  rejectBtn.addEventListener('click', () => updateStatus(doc._id, 'Rechazado'));

  actions.append(approveBtn, rejectBtn);
  row.append(name, date, desc, actions);
  tbody.appendChild(row);
}

function renderAuditRow(doc, tbody) {
  const row       = document.createElement('tr');
  const title     = document.createElement('td'); title.textContent     = doc.title;
  const creator   = document.createElement('td'); creator.textContent   = doc.user?.name || 'Desconocido';
  const createdAt = document.createElement('td'); createdAt.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');
  const status    = document.createElement('td'); status.textContent    = doc.status;
  const reviewed  = document.createElement('td');

  if (doc.approvedBy) {
    reviewed.textContent = `${doc.approvedBy.name} (${new Date(doc.approvedAt).toLocaleDateString('es-CO')})`;
  } else {
    reviewed.textContent = '—';
  }

  row.append(title, creator, createdAt, status, reviewed);
  tbody.appendChild(row);
}
