const API_URL = 'http://localhost:5000/api';
let token = '';
let activeView = 'todos'; // valor por defecto al entrar
let editingQuill;
let currentDocumentId = null;





// Secciones
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const documentsTable = document.getElementById('documentsTable');
const fileForm = document.getElementById('fileForm');
const manualForm = document.getElementById('manualForm');
const uploadDropdown = document.getElementById('uploadDropdown');


// Mostrar u ocultar menú desplegable de "Cargar Documento"
document.getElementById('uploadBtn').addEventListener('click', () => {
  uploadDropdown.style.display = uploadDropdown.style.display === 'block' ? 'none' : 'block';
});

// Abrir formulario de subir archivo
function openUploadForm() {
  fileForm.style.display = 'block';
  manualForm.style.display = 'none';
  uploadDropdown.style.display = 'none';
  documentsTable.style.display = 'none';
}

// Abrir formulario manual
function openManualForm() {
  manualForm.style.display = 'block';
  fileForm.style.display = 'none';
  uploadDropdown.style.display = 'none';
  documentsTable.style.display = 'none';
}

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (data.token && data.user) {
    token = data.token;

    // Limpiar datos anteriores por seguridad
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Guardar nuevos datos
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    const role = data.user.role.trim().toLowerCase();

    // Mostrar u ocultar botones según el rol
    if (role === 'auditor') {
      document.getElementById('btnUserAdmin').style.display = 'block';
      document.getElementById('btnReview').style.display = 'block';
      document.getElementById('btnAudit').style.display = 'block';
    } else {
      // Ocultar administración para todos los demás
      document.getElementById('btnUserAdmin').style.display = 'none';

      // Ocultar revisión y auditoría para contratistas y funcionarios
      document.getElementById('btnReview').style.display = 'none';
      document.getElementById('btnAudit').style.display = 'none';
    }

    // Mostrar interfaz principal
    loginSection.style.display = 'none';
    mainSection.style.display = 'flex';
    document.getElementById('aboutSection').style.display = 'block';
  }




});

// SUBIR ARCHIVO
fileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('titleFile').value;
  const file = document.getElementById('fileUpload').files[0];

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', ''); // vacía por ahora
  formData.append('file', file);

  const res = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
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

// CREAR DOCUMENTO MANUAL
let quill; // editor

document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  // Inicializar editor Quill
  quill = new Quill('#editorContainer', {
    theme: 'snow'
  });

  document.getElementById('btnUserAdmin')?.addEventListener('click', loadUserAdmin);
});

// CREAR DOCUMENTO MANUAL
manualForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('titleManual').value;
  const description = quill.root.innerHTML; // contenido HTML del editor

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
    quill.setContents([]); // limpiar editor
    manualForm.style.display = 'none';
    loadDocuments();
  } else {
    alert('Error al crear documento');
  }
});


// CARGAR Y MOSTRAR DOCUMENTOS
async function loadDocuments() {
  activeView = 'todos';
  hideAllSections();
  const res = await fetch(`${API_URL}/documents`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const documents = await res.json();
  const tbody = documentsTable.querySelector('tbody');
  tbody.innerHTML = '';
  documentsTable.style.display = 'table';
  fileForm.style.display = 'none';
  manualForm.style.display = 'none';

  documents.forEach(doc => {
    const row = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = doc.title;
    name.style.color = 'blue';
    name.style.cursor = 'pointer';
    name.onclick = () => {
      if (doc.file) {
        window.open(`http://localhost:5000/uploads/${doc.file}`, '_blank');
      } else {
        showDocument(doc.title, doc.description, doc._id);
      }
    };
    

    const date = document.createElement('td');
    const fecha = new Date(doc.createdAt);
    date.textContent = fecha.toLocaleDateString('es-CO');

    const status = document.createElement('td');
    status.textContent = doc.status;

    const options = document.createElement('td');
    options.classList.add('options');
    options.innerHTML = '⋮';

    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.onclick = () => deleteDocument(doc._id);

    dropdown.appendChild(deleteBtn);
    options.appendChild(dropdown);

    options.onclick = () => {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };

    row.appendChild(name);
    row.appendChild(date);
    row.appendChild(status);
    row.appendChild(options);
    tbody.appendChild(row);
  });
}

// ELIMINAR DOCUMENTO
async function deleteDocument(id) {
  const confirmDelete = confirm('¿Eliminar este documento?');
  if (!confirmDelete) return;

  const res = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.ok) {
    alert('Documento eliminado');
    loadDocuments();
  } else {
    alert('Error al eliminar');
  }
}

async function loadReviewSection() {
  // Ocultar otras secciones
  activeView = 'revision';
  hideAllSections();
  fileForm.style.display = 'none';
  manualForm.style.display = 'none';
  documentsTable.style.display = 'none';

  // Mostrar sección de revisión
  document.getElementById('reviewTitle').style.display = 'block';
  document.getElementById('reviewTable').style.display = 'table';

  const res = await fetch(`${API_URL}/documents?status=Pendiente`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const documents = await res.json();
  const tbody = document.querySelector('#reviewTable tbody');
  tbody.innerHTML = '';

  documents.forEach(doc => {
    const row = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = doc.title;

    const date = document.createElement('td');
    const fecha = new Date(doc.createdAt);
    date.textContent = fecha.toLocaleDateString('es-CO');

    const description = document.createElement('td');
    description.textContent = doc.description || '[archivo adjunto]';

    const actions = document.createElement('td');
    const approveBtn = document.createElement('button');
    approveBtn.textContent = '✅ Aprobar';
    approveBtn.onclick = () => updateStatus(doc._id, 'Aprobado');

    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = '❌ Rechazar';
    rejectBtn.onclick = () => updateStatus(doc._id, 'Rechazado');

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);

    row.appendChild(name);
    row.appendChild(date);
    row.appendChild(description);
    row.appendChild(actions);
    tbody.appendChild(row);
  });
}

// Actualizar estado del documento
async function updateStatus(id, newStatus) {
  const action = newStatus === 'Aprobado' ? 'approve' : 'reject';

  const res = await fetch(`${API_URL}/documents/${action}/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.ok) {
    alert(`Documento ${newStatus.toLowerCase()} correctamente`);
    loadReviewSection(); // 🔄 recarga la lista
  } else {
    alert('Error al actualizar estado');
  }
}

function hideAllSections() {
  fileForm.style.display = 'none';
  manualForm.style.display = 'none';
  documentsTable.style.display = 'none';
  document.getElementById('reviewTitle').style.display = 'none';
  document.getElementById('reviewTable').style.display = 'none';
  document.getElementById('aboutSection').style.display = 'none';
  document.getElementById('auditTitle').style.display = 'none';
  document.getElementById('auditTable').style.display = 'none';
  userAdminTitle.style.display = 'none';
  userAdminSection.style.display = 'none';
 // 👈 ocultar about
}

// Cerrar sesión
function logout() {
  token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  loginSection.style.display = 'block';
  mainSection.style.display = 'none';

  // Ocultar botón de admin por seguridad
  document.getElementById('btnUserAdmin').style.display = 'none';
}

// Búsqueda avanzada por nombre
document.getElementById('searchInput').addEventListener('input', async function () {
  const query = this.value.toLowerCase();
  hideAllSections();

  let documents = [];
  

  if (activeView === 'todos') {
    const res = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    documents = await res.json();
    documentsTable.style.display = 'table';
  }

  else if (activeView === 'revision') {
    const res = await fetch(`${API_URL}/documents?status=Pendiente`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    documents = await res.json();
    document.getElementById('reviewTitle').style.display = 'block';
    document.getElementById('reviewTable').style.display = 'table';
  }

  else if (activeView === 'auditoria') {
    const res = await fetch(`${API_URL}/documents/audit/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    documents = await res.json();
    document.getElementById('auditTitle').style.display = 'block';
    document.getElementById('auditTable').style.display = 'table';
  }

  else if (activeView === 'usuarios') {
  // Mostrar sección de usuarios
  userAdminTitle.style.display = 'block';
  userAdminSection.style.display = 'block';

  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await res.json();

  const filtered = users.filter(user =>
    user.name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query) ||
    user.role.toLowerCase().includes(query)
  );

  const tbody = usersTable.querySelector('tbody');
  tbody.innerHTML = '';

  filtered.forEach(user => {
    const row = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = user.name;

    const emailTd = document.createElement('td');
    emailTd.textContent = user.email;

    const roleTd = document.createElement('td');
    roleTd.textContent = user.role;

    const actionTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.onclick = () => showEditForm(user, row);
    actionTd.appendChild(editBtn);

    row.appendChild(nameTd);
    row.appendChild(emailTd);
    row.appendChild(roleTd);
    row.appendChild(actionTd);
    tbody.appendChild(row);
  });
}


  // Aplicar filtro
  const filtered = documents.filter(doc => doc.title.toLowerCase().includes(query));

  if (activeView === 'todos') {
    const tbody = documentsTable.querySelector('tbody');
    tbody.innerHTML = '';
    filtered.forEach(doc => renderDocumentRow(doc, tbody));
  }

  if (activeView === 'revision') {
    const tbody = document.querySelector('#reviewTable tbody');
    tbody.innerHTML = '';
    filtered.forEach(doc => renderReviewRow(doc, tbody));
  }

  if (activeView === 'auditoria') {
    const tbody = document.querySelector('#auditTable tbody');
    tbody.innerHTML = '';
    filtered.forEach(doc => renderAuditRow(doc, tbody));
  }
});


async function loadAudit() {
  activeView = 'auditoria';
  hideAllSections();
  document.getElementById('auditTitle').style.display = 'block';
  document.getElementById('auditTable').style.display = 'table';

  const res = await fetch(`${API_URL}/documents/audit/all`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const docs = await res.json();
  const tbody = document.querySelector('#auditTable tbody');
  tbody.innerHTML = '';

  docs.forEach(doc => {
    const row = document.createElement('tr');

    const title = document.createElement('td');
    title.textContent = doc.title;

    const creator = document.createElement('td');
    creator.textContent = doc.user?.name || 'Desconocido';

    const createdAt = document.createElement('td');
    const fecha = new Date(doc.createdAt);
    createdAt.textContent = fecha.toLocaleDateString('es-CO');

    const status = document.createElement('td');
    status.textContent = doc.status;

    const reviewed = document.createElement('td');
    if (doc.approvedBy) {
      const revDate = new Date(doc.approvedAt).toLocaleDateString('es-CO');
      reviewed.textContent = `${doc.approvedBy.name} (${revDate})`;
    } else {
      reviewed.textContent = '—';
    }

    row.appendChild(title);
    row.appendChild(creator);
    row.appendChild(createdAt);
    row.appendChild(status);
    row.appendChild(reviewed);

    tbody.appendChild(row);
  });
}


function renderDocumentRow(doc, tbody) {
  const row = document.createElement('tr');
  const name = document.createElement('td');
  name.textContent = doc.title;
  name.style.color = 'blue';
  name.style.cursor = 'pointer';
  name.onclick = () => {
    if (doc.file) window.open(`http://localhost:5000/uploads/${doc.file}`, '_blank');
    else alert('Descripción:\n' + doc.description);
  };

  const date = document.createElement('td');
  date.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');

  const status = document.createElement('td');
  status.textContent = doc.status;

  const options = document.createElement('td');
  options.classList.add('options');
  options.innerHTML = '⋮';

  const dropdown = document.createElement('div');
  dropdown.classList.add('dropdown');
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.onclick = () => deleteDocument(doc._id);
  dropdown.appendChild(deleteBtn);
  options.appendChild(dropdown);

  options.onclick = () => {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  };

  row.appendChild(name);
  row.appendChild(date);
  row.appendChild(status);
  row.appendChild(options);
  tbody.appendChild(row);
}

function renderReviewRow(doc, tbody) {
  const row = document.createElement('tr');
  const name = document.createElement('td');
  name.textContent = doc.title;

  const date = document.createElement('td');
  date.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');

  const desc = document.createElement('td');
  desc.textContent = doc.description || '[archivo adjunto]';

  const actions = document.createElement('td');
  const approveBtn = document.createElement('button');
  approveBtn.textContent = '✅ Aprobar';
  approveBtn.onclick = () => updateStatus(doc._id, 'Aprobado');

  const rejectBtn = document.createElement('button');
  rejectBtn.textContent = '❌ Rechazar';
  rejectBtn.onclick = () => updateStatus(doc._id, 'Rechazado');

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);

  row.appendChild(name);
  row.appendChild(date);
  row.appendChild(desc);
  row.appendChild(actions);
  tbody.appendChild(row);
}

function renderAuditRow(doc, tbody) {
  const row = document.createElement('tr');
  const title = document.createElement('td');
  title.textContent = doc.title;

  const creator = document.createElement('td');
  creator.textContent = doc.user?.name || 'Desconocido';

  const createdAt = document.createElement('td');
  createdAt.textContent = new Date(doc.createdAt).toLocaleDateString('es-CO');

  const status = document.createElement('td');
  status.textContent = doc.status;

  const reviewed = document.createElement('td');
  if (doc.approvedBy) {
    const revDate = new Date(doc.approvedAt).toLocaleDateString('es-CO');
    reviewed.textContent = `${doc.approvedBy.name} (${revDate})`;
  } else {
    reviewed.textContent = '—';
  }

  row.appendChild(title);
  row.appendChild(creator);
  row.appendChild(createdAt);
  row.appendChild(status);
  row.appendChild(reviewed);
  tbody.appendChild(row);
}

document.getElementById("btnGenerarReporte").addEventListener("click", async () => {
  const response = await fetch('/api/documentos/reporte', {
    method: 'GET'
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "reporte.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
});


function showDocument(title, htmlContent) {
  document.getElementById('viewerTitle').innerText = title;
  document.getElementById('viewerContent').innerHTML = htmlContent;

  // Ocultar secciones
  manualForm.style.display = 'none';
  fileForm.style.display = 'none';
  documentsTable.style.display = 'none';

  // Mostrar visor
  document.getElementById('documentViewer').style.display = 'block';
}

function closeViewer() {
  document.getElementById('documentViewer').style.display = 'none';
  loadDocuments(); // Opcional: recargar lista de documentos
}

function showDocument(title, htmlContent, id = null) {
  document.getElementById('viewerTitle').innerText = title;
  document.getElementById('viewerContent').innerHTML = htmlContent;

  // Guardar el ID para editar
  currentDocumentId = id;

  // Mostrar visor, ocultar otros
  hideAllSections();
  document.getElementById('documentViewer').style.display = 'block';
  document.getElementById('viewerContent').style.display = 'block';
  document.getElementById('editBtn').style.display = 'inline-block';
  document.getElementById('editorView').style.display = 'none';
}

function enableEditor() {
  const contentHTML = document.getElementById('viewerContent').innerHTML;
  document.getElementById('viewerContent').style.display = 'none';
  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('editorView').style.display = 'block';

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

const userAdminTitle = document.getElementById('userAdminTitle');
const userAdminSection = document.getElementById('userAdminSection');
const usersTable = document.getElementById('usersTable');
const newUserForm = document.getElementById('newUserForm');

async function fetchUsers() {
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await res.json();

  const tbody = usersTable.querySelector('tbody');
  tbody.innerHTML = '';

  users.forEach(user => {
    const row = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = user.name;

    const emailTd = document.createElement('td');
    emailTd.textContent = user.email;

    const roleTd = document.createElement('td');
    roleTd.textContent = user.role;

    const actionTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.onclick = () => showEditForm(user, row);
    actionTd.appendChild(editBtn);

    row.appendChild(nameTd);
    row.appendChild(emailTd);
    row.appendChild(roleTd);
    row.appendChild(actionTd);
    tbody.appendChild(row);
  });
}


newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('newUserName').value;
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;

  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
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

function showEditForm(user, rowElement) {
  const formRow = document.createElement('tr');
  const formTd = document.createElement('td');
  formTd.colSpan = 4;

  formTd.innerHTML = `
    <form id="editUserForm-${user._id}" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 10px;">
      <input type="text" name="name" value="${user.name}" placeholder="Nombre" required>
      <input type="email" name="email" value="${user.email}" placeholder="Correo" required>
      <input type="password" name="password" placeholder="Nueva contraseña">
      <select name="role">
        <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionario</option>
        <option value="contratista" ${user.role === 'contratista' ? 'selected' : ''}>Contratista</option>
        <option value="auditor" ${user.role === 'auditor' ? 'selected' : ''}>Auditor</option>
      </select>
      <button type="submit">Guardar</button>
      <button type="button" onclick="this.closest('tr').remove()">Cancelar</button>
    </form>
  `;

  formRow.appendChild(formTd);
  rowElement.after(formRow);

  const form = formTd.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.password) delete data.password; // No actualizar si está vacío

    const res = await fetch(`${API_URL}/users/${user._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert('Usuario actualizado');
      fetchUsers();
    } else {
      alert('Error al actualizar usuario');
    }
  };
}

function loadUserAdmin() {
  activeView = 'usuarios';
  hideAllSections();
  userAdminTitle.style.display = 'block';
  userAdminSection.style.display = 'block';
  fetchUsers();
}
