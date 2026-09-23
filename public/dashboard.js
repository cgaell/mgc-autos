const token = localStorage.getItem('mgc_token');
const role = localStorage.getItem('mgc_rol');

if (!token || role !== 'administrador') {
	window.location.replace('/');
}

const formatDate = (dateValue) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateValue));
const formatVehicle = (request) => `${request.make} ${request.model} (${request.year})`;
const statusClass = (status) => status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

document.querySelector('#profile-name').textContent = localStorage.getItem('mgc_nombre') || 'Administrador';
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

const updateRequestStatus = async (id, estado, motivoRechazo) => {
	const response = await fetch(`/api/admin/solicitudes/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ estado, motivoRechazo })
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result.error || 'No fue posible actualizar la solicitud.');
	return result;
};

const updatePolicyStatus = async (id, estatus) => {
	const response = await fetch(`/api/admin/polizas/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ estatus })
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result.error || 'No fue posible actualizar la póliza.');
	return result;
};

const requestActions = (request) => {
	const estado = request.estado || 'Pendiente';
	if (estado !== 'Pendiente') {
		const reason = request.motivoRechazo ? `<small class="rejection-reason">Motivo: ${request.motivoRechazo}</small>` : '';
		return `<span class="status ${estado === 'Aceptada' ? 'accepted' : 'rejected'}">${estado}</span>${reason}`;
	}
	return `<div class="request-actions"><select class="request-status" data-request-id="${request.id}" aria-label="Estado de solicitud"><option value="">Actualizar...</option><option value="Aceptada">Aceptar</option><option value="Rechazada">Rechazar</option></select><textarea class="rejection-input" data-request-id="${request.id}" placeholder="Motivo del rechazo" aria-label="Motivo del rechazo" hidden></textarea><button class="save-request-status" data-request-id="${request.id}" type="button">Guardar</button></div>`;
};

const renderRequests = (requests) => {
	document.querySelector('#request-label').textContent = `${requests.length} registradas`;
	const body = document.querySelector('#requests-body');
	if (!requests.length) {
		body.innerHTML = '<tr><td colspan="6" class="empty">Todavía no hay solicitudes registradas.</td></tr>';
		return;
	}
	body.innerHTML = requests.slice(0, 8).map((request) => `<tr><td><strong>${request.name}</strong><small>${request.email}</small></td><td><strong>${formatVehicle(request)}</strong><small>${request.line} · ${request.purpose}</small></td><td>${request.use}</td><td>${request.phone}</td><td>${formatDate(request.createdAt)}</td><td>${requestActions(request)}</td></tr>`).join('');
	body.querySelectorAll('.request-status').forEach((select) => select.addEventListener('change', () => {
		const reason = body.querySelector(`.rejection-input[data-request-id="${select.dataset.requestId}"]`);
		reason.hidden = select.value !== 'Rechazada';
	}));
	body.querySelectorAll('.save-request-status').forEach((button) => button.addEventListener('click', async () => {
		const id = button.dataset.requestId;
		const select = body.querySelector(`.request-status[data-request-id="${id}"]`);
		const reason = body.querySelector(`.rejection-input[data-request-id="${id}"]`);
		if (!select.value) return window.alert('Selecciona un estado.');
		if (select.value === 'Rechazada' && !reason.value.trim()) return window.alert('Escribe el motivo del rechazo.');
		button.disabled = true;
		try {
			await updateRequestStatus(id, select.value, reason.value);
			const requests = await getAdminData('solicitudes');
			renderRequests(requests);
		} catch (error) {
			window.alert(error.message);
			button.disabled = false;
		}
	}));
};

const renderPolicies = (policies) => {
	document.querySelector('#policy-label').textContent = `${policies.length} totales`;
	const body = document.querySelector('#policies-body');
	if (!policies.length) {
		body.innerHTML = '<tr><td colspan="4" class="empty">No hay pólizas para mostrar.</td></tr>';
		return;
	}
	body.innerHTML = policies.slice(0, 8).map((policy) => `<tr><td><strong>${policy.id}</strong></td><td>${policy.numeroSerieVehiculo}</td><td>${formatDate(policy.vigenciaInicio)} - ${formatDate(policy.vigenciaFin)}</td><td><div class="policy-actions"><span class="status ${statusClass(policy.estatus)}">${policy.estatus}</span><select class="policy-status" data-policy-id="${policy.id}" aria-label="Estatus de póliza"><option value="">Actualizar...</option><option value="Activa">Activa</option><option value="Cancelada">Cancelada</option><option value="Inactiva">Inactiva</option><option value="Pendiente de renovación">Pendiente de renovación</option></select><button class="save-policy-status" data-policy-id="${policy.id}" type="button">Guardar</button></div></td></tr>`).join('');
	body.querySelectorAll('.save-policy-status').forEach((button) => button.addEventListener('click', async () => {
		const id = button.dataset.policyId;
		const select = body.querySelector(`.policy-status[data-policy-id="${id}"]`);
		if (!select.value) return window.alert('Selecciona un estatus.');
		button.disabled = true;
		try {
			await updatePolicyStatus(id, select.value);
			const updatedPolicies = await getAdminData('polizas');
			renderPolicies(updatedPolicies);
		} catch (error) {
			window.alert(error.message);
			button.disabled = false;
		}
	}));
};

Promise.all([getAdminData('solicitudes'), getAdminData('polizas')])
	.then(([requests, policies]) => {
		renderRequests(requests);
		renderPolicies(policies);
	})
	.catch((error) => {
		document.querySelector('#requests-body').innerHTML = `<tr><td colspan="6" class="error">${error.message}</td></tr>`;
		document.querySelector('#policies-body').innerHTML = `<tr><td colspan="4" class="error">${error.message}</td></tr>`;
	});