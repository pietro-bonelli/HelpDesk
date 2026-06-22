document.addEventListener('DOMContentLoaded', () => {
    dropdownMenuListeners();
    userProfileListener();

    loadUserInfo();
});

function dropdownMenuListeners() {
    const dropdowMenuElements = document.getElementsByClassName('dropdown-menu-btn');
    for(const e of dropdowMenuElements) {
        const menu = e.parentElement.getElementsByClassName('menu');
        e.addEventListener('click', () => {
            menu[0].classList.toggle('menu-closed');
        });

        // Listener per click fuori dal menu+
        document.addEventListener('click', (event) => {
            // Menu aperto
            if(!menu[0].classList.contains('menu-closed')) {
                if(!e.contains(event.target)) {
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
    })
}

async function loadUserInfo() {
    try {
        const res = await fetch('/api/users/me');
        const resJSON = await res.json();

        if(!resJSON.success) {
            headerElement.classList.remove('logged');
            return;
        }

        console.log(resJSON);

        const headerElement = document.querySelector('header');
        const userDisplay = document.getElementById('user-profile-display');
        const userAvatar = document.getElementById('user-profile-avatar');
        const userEmail = document.getElementById('user-profile-email');
        const userRole = document.getElementById('user-profile-role');

        headerElement.classList.add('logged');
        userDisplay.textContent = resJSON.user.first_name + " " + resJSON.user.last_name;
        userAvatar.textContent = resJSON.user.first_name.at(0) + resJSON.user.last_name.at(0);
        userEmail.textContent = resJSON.user.email;

        if(resJSON.user.is_admin) {
            userAvatar.classList.add('admin-avatar');
            userRole.textContent = 'Amministratore';
            userRole.classList.add('admin');
        } else if(resJSON.user.role_name) {
            userAvatar.classList.add('operator-avatar');
            userRole.textContent = resJSON.user.role_name;
            userRole.classList.add('operator');
        } else {
            userAvatar.classList.add('client-avatar');
            userRole.textContent = 'Cliente';
            userRole.classList.add('client');
        }

    } catch(error) {
        //showToast('Errore', 'Impossibile recuperare dati utente.', 'error');
    }
}

async function logOut() {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        const resJSON = await res.json();

        if(resJSON) {
            showToast('Successo', resJSON.message, 'success');
            setTimeout(() => {
                        window.location.href = '/index.html'; 
            }, 1000);
        } else {
            showToast('Errore'. resJSON.message, 'error');
        }
    } catch(error) {
        showToast('Errore', 'Si è verificato un problema.', 'error');
    }
}