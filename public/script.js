const quoteForm = document.querySelector('#quote-form');
const steps = [...document.querySelectorAll('.form-step')];
const progressBars = [...document.querySelectorAll('.progress span')];
const stepNumber = document.querySelector('#step-number');
const quoteCard = document.querySelector('.quote-card');
const quoteResult = document.querySelector('#quote-result');
const totalSteps = steps.length;
let currentStep = 1;

function showStep(step) {
	currentStep = step;
	steps.forEach((item) => item.classList.toggle('active', Number(item.dataset.step) === step));
	progressBars.forEach((bar, index) => bar.classList.toggle('progress-active', index < step));
	stepNumber.textContent = step;
}

document.querySelectorAll('.next-step').forEach((button) => {
	button.addEventListener('click', () => {
		const currentFormStep = button.closest('.form-step');
		const requiredFields = [...currentFormStep.querySelectorAll('[required]')];
		if (requiredFields.some((field) => !field.reportValidity())) return;
		showStep(Math.min(currentStep + 1, totalSteps));
	});
});

document.querySelectorAll('.previous-step').forEach((button) => {
	button.addEventListener('click', () => showStep(Math.max(currentStep - 1, 1)));
});

document.querySelectorAll('input[type="file"]').forEach((input) => {
	input.addEventListener('change', () => {
		const slot = input.closest('.photo-slot');
		const fileName = slot.querySelector('strong');
		if (input.files[0]) fileName.textContent = input.files[0].name;
		slot.classList.toggle('has-file', Boolean(input.files[0]));
	});
});

quoteForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const submitButton = quoteForm.querySelector('button[type="submit"]');
	const payload = Object.fromEntries(new FormData(quoteForm).entries());
	payload.photos = Object.fromEntries([...quoteForm.querySelectorAll('input[type="file"]')]
		.filter((input) => input.files[0])
		.map((input) => [input.name, input.files[0].name]));
	submitButton.disabled = true;

	try {
		const response = await fetch('/api/solicitudes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'No fue posible guardar la solicitud.');
		quoteCard.classList.add('result-visible');
		quoteResult.classList.add('visible');
	} catch (error) {
		window.alert(error.message);
	} finally {
		submitButton.disabled = false;
	}
});

document.querySelector('.restart').addEventListener('click', () => {
	quoteCard.classList.remove('result-visible');
	quoteResult.classList.remove('visible');
	showStep(1);
	document.querySelector('[name="purpose"]').focus();
});

const authModal = document.querySelector('#auth-modal');
const authForm = document.querySelector('#auth-form');
const authTitle = document.querySelector('#auth-title');
const authIntro = document.querySelector('#auth-intro');
const authSubmit = document.querySelector('#auth-submit');
const authSwitch = document.querySelector('#auth-switch');
const authMessage = document.querySelector('#auth-message');
const authNameField = document.querySelector('.auth-name-field');
const guestActions = document.querySelector('#guest-actions');
const sessionActions = document.querySelector('#session-actions');
const sessionName = document.querySelector('#session-name');
const adminDashboardLink = document.querySelector('#admin-dashboard-link');
const userMenuToggle = document.querySelector('#user-menu-toggle');
const userMenu = document.querySelector('#user-menu');
const logoutButton = document.querySelector('#logout-button');
let authMode = 'login';

function updateSessionView() {
	const name = localStorage.getItem('mgc_nombre');
	const role = localStorage.getItem('mgc_rol');
	const isAuthenticated = Boolean(localStorage.getItem('mgc_token') && name);
	guestActions.hidden = isAuthenticated;
	sessionActions.hidden = !isAuthenticated;
	adminDashboardLink.hidden = role !== 'administrador';
	if (isAuthenticated) sessionName.textContent = name;
}

userMenuToggle.addEventListener('click', () => {
	const isOpen = !userMenu.hidden;
	userMenu.hidden = isOpen;
	userMenuToggle.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
	if (!sessionActions.contains(event.target)) {
		userMenu.hidden = true;
		userMenuToggle.setAttribute('aria-expanded', 'false');
	}
});

function setAuthMode(mode) {
	authMode = mode;
	const isRegistering = mode === 'register';
	authTitle.textContent = isRegistering ? 'Crea tu cuenta' : 'Inicia sesión';
	authIntro.textContent = isRegistering ? 'Regístrate para dar seguimiento a tus solicitudes.' : 'Consulta tus solicitudes y continúa cuando quieras.';
	authSubmit.innerHTML = `${isRegistering ? 'Registrarme' : 'Iniciar sesión'} <span>→</span>`;
	authSwitch.textContent = isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
	authNameField.hidden = !isRegistering;
	authNameField.querySelector('input').required = isRegistering;
	authForm.reset();
	authMessage.textContent = '';
	authMessage.classList.remove('success');
}

function openAuth(mode) {
	setAuthMode(mode);
	authModal.hidden = false;
	authForm.querySelector('input[name="email"]').focus();
}

document.querySelectorAll('[data-auth-mode]').forEach((button) => {
	button.addEventListener('click', () => openAuth(button.dataset.authMode));
});

document.querySelectorAll('[data-auth-close]').forEach((element) => {
	element.addEventListener('click', () => { authModal.hidden = true; });
});

authSwitch.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const payload = Object.fromEntries(new FormData(authForm).entries());
	const endpoint = authMode === 'register' ? '/api/auth/registrar' : '/api/auth/login';
	authSubmit.disabled = true;
	authMessage.textContent = 'Procesando...';

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'No fue posible completar la solicitud.');
		if (authMode === 'login') {
			localStorage.setItem('mgc_token', result.token);
			localStorage.setItem('mgc_rol', result.rol);
			localStorage.setItem('mgc_nombre', result.nombre);
			updateSessionView();
			if (result.rol === 'administrador') {
				window.location.href = '/dashboard.html';
				return;
			}
			authMessage.textContent = 'Sesión iniciada correctamente.';
			authMessage.classList.add('success');
			setTimeout(() => { authModal.hidden = true; }, 900);
		} else {
			setAuthMode('login');
			authMessage.textContent = 'Cuenta creada. Ahora inicia sesión.';
			authMessage.classList.add('success');
		}
	} catch (error) {
		authMessage.textContent = error.message;
	} finally {
		authSubmit.disabled = false;
	}
});

logoutButton.addEventListener('click', () => {
	localStorage.removeItem('mgc_token');
	localStorage.removeItem('mgc_rol');
	localStorage.removeItem('mgc_nombre');
	userMenu.hidden = true;
	updateSessionView();
});

updateSessionView();
