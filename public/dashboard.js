const token = localStorage.getItem('mgc_token');
const role = localStorage.getItem('mgc_rol');

if (!token || role !== 'administrador') {
	window.location.replace('/');
}

const formatDate = (dateValue) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateValue));
const formatVehicle = (request) => `${request.make} ${request.model} (${request.year})`;
const statusClass = (status) => status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

document.querySelector('#profile-name').textContent = localStorage.getItem('mgc_nombre') || 'Administrador';
document.querySelector('#current-date').textContent = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
document.querySelector('#logout-button').addEventListener('click', () => {
	localStorage.removeItem('mgc_token');
	localStorage.removeItem('mgc_rol');
	localStorage.removeItem('mgc_nombre');
	window.location.replace('/');
});

const getAdminData = async (resource) => {
	const response = await fetch(`/api/admin/${resource}`, { headers: { Authorization: `Bearer ${token}` } });
	if (!response.ok) throw new Error('No fue posible cargar la información.');
	return response.json();
};

const renderRequests = (requests) => {
	document.querySelector('#request-count').textContent = requests.length;
	document.querySelector('#request-label').textContent = `${requests.length} registradas`;
	const body = document.querySelector('#requests-body');
	if (!requests.length) {
		body.innerHTML = '<tr><td colspan="5" class="empty">Todavía no hay solicitudes registradas.</td></tr>';
		return;
	}
	body.innerHTML = requests.slice(0, 8).map((request) => `<tr><td><strong>${request.name}</strong><small>${request.email}</small></td><td><strong>${formatVehicle(request)}</strong><small>${request.line} · ${request.purpose}</small></td><td>${request.use}</td><td>${request.phone}</td><td>${formatDate(request.createdAt)}</td></tr>`).join('');
};

const renderPolicies = (policies) => {
	const active = policies.filter((policy) => policy.estatus === 'Activa').length;
	const pending = policies.filter((policy) => policy.estatus === 'Pendiente').length;
	document.querySelector('#active-policy-count').textContent = active;
	document.querySelector('#pending-policy-count').textContent = pending;
	document.querySelector('#policy-label').textContent = `${policies.length} totales`;
	const body = document.querySelector('#policies-body');
	if (!policies.length) {
		body.innerHTML = '<tr><td colspan="4" class="empty">No hay pólizas para mostrar.</td></tr>';
		return;
	}
	body.innerHTML = policies.slice(0, 8).map((policy) => `<tr><td><strong>${policy.id}</strong></td><td>${policy.numeroSerieVehiculo}</td><td>${formatDate(policy.vigenciaInicio)} - ${formatDate(policy.vigenciaFin)}</td><td><span class="status ${statusClass(policy.estatus)}">${policy.estatus}</span></td></tr>`).join('');
};

Promise.all([getAdminData('solicitudes'), getAdminData('polizas')])
	.then(([requests, policies]) => {
		renderRequests(requests);
		renderPolicies(policies);
	})
	.catch((error) => {
		document.querySelector('#requests-body').innerHTML = `<tr><td colspan="5" class="error">${error.message}</td></tr>`;
		document.querySelector('#policies-body').innerHTML = `<tr><td colspan="4" class="error">${error.message}</td></tr>`;
	});