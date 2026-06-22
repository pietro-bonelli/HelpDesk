document.addEventListener('DOMContentLoaded', () => {
    dropdownMenuListeners();
    userProfileListener();
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
}

function userProfileListener() {
    const userProfileBtn = document.getElementById('user-profile-button');
    const userProfileDropdown = document.getElementById('user-section-dropdown');
    userProfileBtn.addEventListener('click', () => {
        userProfileDropdown.classList.toggle('closed');
    })
}