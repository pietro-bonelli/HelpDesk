let loginCard;

document.addEventListener('DOMContentLoaded', async () => {
    await checkLogin();

    loginCard = document.getElementById('login-card');

    const accessButton = document.getElementById('slider-accedi');
    const registerButton = document.getElementById('slider-registrati');

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.get('register') === "1")
        switchToRegister();

    accessButton.addEventListener('click', () => {
        switchToLogin();
        hideErrorMessage();
    });
    registerButton.addEventListener('click', () => {
        switchToRegister();
        hideErrorMessage();
    });

    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        hideErrorMessage();
        const email = document.querySelector('#form-login input[name="email"]');
        const password = document.querySelector('#form-login input[name="password"]');
        login(loginForm, email.value, password.value);

    });

    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        hideErrorMessage();
        if (!checkPassword())
            return;
        const email = document.querySelector('#form-register input[name="email"]');
        const first_name = document.querySelector('#form-register input[name="first_name"]');
        const last_name = document.querySelector('#form-register input[name="last_name"]');
        const password = document.querySelector('#form-register input[name="password"]');
        register(registerForm, first_name.value, last_name.value, email.value, password.value);
    });

    const confirmPassword = document.querySelector('#form-register input[name="conferma-password"]');
    confirmPassword.addEventListener('blur', () => {
        checkPassword();
    });
});

async function checkLogin() {
    try {
        const res = await fetch('/api/users/me');
        const resJSON = await res.json();
        if (resJSON.success)
            window.location.href = '/dashboard';
    } catch (error) {
    }
}

async function login(formElement, email, password) {
    const data = {
        email: email,
        password: password
    };
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const resJSON = await res.json();

        if (resJSON.success) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect') || '/dashboard';
            window.location.href = redirectUrl;
        } else {
            showErrorMessage(resJSON.message);
        }
    } catch (error) {
        showErrorMessage('Si è verificato un problema durante la connessione al server.');
    } finally {
        if (formElement)
            formElement.dispatchEvent(new CustomEvent('loading-end'));
    }
}

async function register(formElement, first_name, last_name, email, password) {
    const data = {
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password
    };

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const resJSON = await res.json();

        if (resJSON.success) {
            window.location.href = '/dashboard';
        } else {
            showErrorMessage(resJSON.message);
        }
    } catch (error) {
        showErrorMessage('Si è verificato un problema durante la connessione al server.');
    } finally {
        if (formElement)
            formElement.dispatchEvent(new CustomEvent('loading-end'));
    }
}

function checkPassword() {
    hideErrorMessage();

    const password1 = document.querySelector('#form-register input[name="password"]');
    const password2 = document.querySelector('#form-register input[name="conferma-password"]');
    const submitButton = document.getElementById('submit-register');

    submitButton.disabled = false;
    password1.classList.remove('input-error');
    password2.classList.remove('input-error');

    if (password1.value !== password2.value) {
        showErrorMessage('Le password inserite non combaciano');
        password1.classList.add('input-error');
        password2.classList.add('input-error');

        submitButton.disabled = true;
        return false;
    }
    return true;
}


function switchToRegister() {
    loginCard.classList.add('register');
}
function switchToLogin() {
    loginCard.classList.remove('register');
}

function showErrorMessage(message) {
    const errorContainer = document.getElementById('error-message-container');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorContainer.classList.add('show');
}
function hideErrorMessage() {
    const errorContainer = document.getElementById('error-message-container');
    errorContainer.classList.remove('show');
}