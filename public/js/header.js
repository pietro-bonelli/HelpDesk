document.addEventListener('DOMContentLoaded', () => {
    dropdownMenuListeners();
    userProfileListener();

    loadUserInfo();
});

function dropdownMenuListeners() {
    const dropdowMenuElements = document.getElementsByClassName('dropdown-menu-btn');
    for (const e of dropdowMenuElements) {
        const menu = e.parentElement.getElementsByClassName('menu');
        e.addEventListener('click', () => {
            menu[0].classList.toggle('menu-closed');
        });

        // Listener per click fuori dal menu+
        document.addEventListener('click', (event) => {
            // Menu aperto
            if (!menu[0].classList.contains('menu-closed')) {
                // Chiudi solo se il click non è né sul bottone hamburger né all'interno del menu stesso
                if (!e.contains(event.target) && !menu[0].contains(event.target)) {
                    menu[0].classList.add('menu-closed');
                }
            }
        });
    }


    const logOutElement = document.getElementById('logout');
    logOutElement.addEventListener('click', (e) => {
        e.preventDefault();
        logOut();
    });
}

function userProfileListener() {
    const userProfileBtn = document.getElementById('user-profile-button');
    const userProfileDropdown = document.getElementById('user-section-dropdown');
    userProfileBtn.addEventListener('click', () => {
        userProfileDropdown.classList.toggle('closed');
    });
}

async function loadUserInfo() {
    try {
        const res = await fetch('/api/users/me');
        const resJSON = await res.json();

        const headerElement = document.querySelector('header');

        if (!resJSON.success) {
            headerElement.classList.remove('logged');
            return;
        }

        const userDisplay = document.getElementById('user-profile-display');
        const userAvatar = document.getElementById('user-profile-avatar');
        const userEmail = document.getElementById('user-profile-email');
        const userRole = document.getElementById('user-profile-role');

        headerElement.classList.add('logged');
        userDisplay.textContent = resJSON.user.first_name + " " + resJSON.user.last_name;
        userAvatar.textContent = resJSON.user.first_name.at(0) + resJSON.user.last_name.at(0);
        userEmail.textContent = resJSON.user.email;

        const adminSectionButton = document.getElementById('admin-section-button');
        const operatorSectionButton = document.getElementById('operator-section-button');
        const operatorDashboard = document.getElementById('operator-dashboard');
        const dashboard = document.getElementById('dashboard');

        if (resJSON.user.is_admin) {
            userAvatar.classList.add('admin-avatar');
            userRole.appendChild(getUserBadge('admin'));

            adminSectionButton.classList.remove('hidden');
            operatorSectionButton.classList.remove('hidden');
            operatorDashboard.classList.remove('hidden');
            dashboard.classList.add('hidden');
        } else if (resJSON.user.role_name) {
            userAvatar.classList.add('operator-avatar');
            userRole.appendChild(getUserBadge(resJSON.user.role_name));

            operatorSectionButton.classList.remove('hidden');
            operatorDashboard.classList.remove('hidden');
            dashboard.classList.add('hidden');
        } else {
            userAvatar.classList.add('client-avatar');
            userRole.appendChild(getUserBadge('client'));
        }

    } catch (error) {
        //showToast('Errore', 'Impossibile recuperare dati utente.', 'error');
    }
}

async function logOut() {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        const resJSON = await res.json();

        if (resJSON) {
            showToast('Successo', resJSON.message, 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showToast('Errore', resJSON.message, 'error');
        }
    } catch (error) {
        showToast('Errore', 'Si è verificato un problema.', 'error');
    }
}