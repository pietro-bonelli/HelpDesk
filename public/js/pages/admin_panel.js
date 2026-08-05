let contentArea;
let userList = {};
let roleList = {};
let categoryList = {};
let activePage;

document.addEventListener('DOMContentLoaded', () => {
    contentArea = document.getElementById('content-area');

    loadSelectorSwitch();

    switchToPage('operators');
});

function fetchOperators(search = "") {
    userList = {};
    let scroll;
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.id = 'operators-table';
    tableWrapper.appendChild(table);

    const tHead = document.createElement('thead');
    const tr = document.createElement('tr');
    const headers = ['ID', 'Nome', 'Cognome', 'Email', 'Ruolo', 'Attivo', 'Azioni'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.className = 'label-upper';
        th.textContent = header;
        tr.appendChild(th);
    });
    tHead.appendChild(tr);
    table.appendChild(tHead);

    const tBody = document.createElement('tbody');
    table.appendChild(tBody);

    const trigger = document.createElement('div');
    trigger.classList = 'spinner';
    trigger.id = 'infinite-scroll-trigger';
    contentArea.appendChild(tableWrapper);

    tableWrapper.appendChild(trigger);

    scroll = new InfiniteScroll(trigger, async (nextPage) => {
        try {
            const res = await fetch('/api/admin/users?page=' + nextPage + "&search=" + search);
            const resJSON = await res.json();

            for (const user of resJSON.users) {
                userList[user.id] = user;

                const userRow = document.createElement('tr');
                tBody.appendChild(userRow);

                const id = user.id;
                const first_name = user.first_name;
                const last_name = user.last_name;
                const email = user.email;
                const role = user.role_name;

                userRow.dataset.user_id = id;

                const tdId = document.createElement('td');
                tdId.appendChild(getIDBadge(id));
                const tdFirstName = document.createElement('td');
                tdFirstName.textContent = first_name;
                const tdLastName = document.createElement('td');
                tdLastName.textContent = last_name;
                const tdEmail = document.createElement('td');
                tdEmail.textContent = email;
                const tdRole = document.createElement('td');
                tdRole.appendChild(getUserBadge(role));

                const tdActive = document.createElement('td');
                if (user.is_active) {
                    tdActive.innerHTML = '<i class="fa-regular fa-circle-check"></i>'
                    tdActive.style.color = 'var(--color-success)';
                } else {
                    tdActive.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>'
                    tdActive.style.color = 'var(--color-error)';
                }

                const tdActions = document.createElement('td');
                const tdActionsWrapper = document.createElement('div');
                tdActionsWrapper.classList.add('table-actions');
                tdActions.appendChild(tdActionsWrapper);
                const editAction = document.createElement('div');
                editAction.className = 'btn-sm btn-ghost btn-edit-user';
                editAction.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
                tdActionsWrapper.appendChild(editAction);
                const deleteAction = document.createElement('div');
                deleteAction.className = 'btn-sm btn-ghost btn-delete-user';
                deleteAction.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteAction.style.color = 'var(--color-error)';
                tdActionsWrapper.appendChild(deleteAction);

                userRow.appendChild(tdId);
                userRow.appendChild(tdFirstName);
                userRow.appendChild(tdLastName);
                userRow.appendChild(tdEmail);
                userRow.appendChild(tdRole);
                userRow.appendChild(tdActive);
                userRow.appendChild(tdActions);
            }

            return (resJSON.users.length === 10);
        } catch (error) {
            console.error(error);
            showToast('Errore', 'Impossibile recuperare la lista utenti.', 'error');
            return;
        }
    });

    loadOperatorsActions();
}

function switchToPage(page) {
    resetContent();
    const navItems = document.querySelectorAll('#selector .nav-item');
    for (const e of navItems) {
        if (e.classList.contains('nav-item'))
            e.classList.remove('active');
    }

    const contentTitle = document.getElementById('content-title');
    const contentButton = document.getElementById('content-button');
    const searchBar = document.getElementById('search-bar');

    contentButton.classList.remove('hidden');
    searchBar.classList.add('hidden');

    switch (page) {
        case 'operators':
            activePage = 'operators';
            const operatorsSwitch = document.getElementById('operators-switch');
            operatorsSwitch.classList.add('active');
            fetchOperators();
            loadSearchBarListener(searchBar);

            contentTitle.textContent = 'Gestione Operatori';
            contentButton.classList.add('hidden');
            searchBar.classList.remove('hidden');

            contentButton.dataset.page = 'operators';
            break;
        case 'roles':
            activePage = 'roles';
            const rolesSwitch = document.getElementById('roles-switch');
            rolesSwitch.classList.add('active');
            fetchRoles();

            contentTitle.textContent = 'Gestione Ruoli';
            contentButton.innerHTML = '<i class="fa-solid fa-plus btn-icon"></i>Nuovo Ruolo';

            contentButton.dataset.page = 'roles';
            break;
        case 'categories':
            activePage = 'categories';
            const categoriesSwitch = document.getElementById('categories-switch');
            categoriesSwitch.classList.add('active');
            fetchCategories();

            contentTitle.textContent = 'Gestione Categorie';
            contentButton.innerHTML = '<i class="fa-solid fa-plus btn-icon"></i>Nuova Categoria';

            contentButton.dataset.page = 'categories';
            break;
    }
}

function loadSearchBarListener(searchBarElement) {

    let debounceTimer;

    searchBarElement.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            search = event.target.value.trim();

            resetContent();
            fetchOperators(search);
        }, 500); // si esegue con 500ms di ritardo e solo se non ci sono altri input nel frattempo
    });
}

function loadOperatorsActions() {
    const table = document.getElementById('operators-table');

    table.addEventListener('click', (event) => {
        const clicked = event.target.closest('.btn-edit-user, .btn-delete-user');
        if (!clicked)
            return;

        const userRow = clicked.closest('tr');
        const userID = userRow.dataset.user_id;

        if (clicked.classList.contains('btn-edit-user')) {
            openEditOperatorModal(userID, userList[userID].first_name, userList[userID].last_name, userList[userID].email, userList[userID].role_id, userList[userID].is_active);
        } else if (clicked.classList.contains('btn-delete-user')) {
            openDeleteModal(userID, 'users');
        }
    });
}

async function openEditOperatorModal(id, first_name, last_name, email, role, is_active) {
    setModalTitle('Modifica Operatore');

    const form = document.createElement('form');
    addModalElement(form);
    form.id = 'edit-user-form';

    const firstNameLabel = document.createElement('label');
    form.appendChild(firstNameLabel);
    firstNameLabel.htmlFor = 'first_name';
    firstNameLabel.className = 'label-upper';
    firstNameLabel.textContent = 'Nome';
    const firstName = document.createElement('input');
    form.appendChild(firstName);
    firstName.type = 'text';
    firstName.value = first_name;
    firstName.name = 'first_name';

    const lastNameLabel = document.createElement('label');
    form.appendChild(lastNameLabel);
    lastNameLabel.htmlFor = 'last_name';
    lastNameLabel.className = 'label-upper';
    lastNameLabel.textContent = 'Cognome';
    const lastName = document.createElement('input');
    form.appendChild(lastName);
    lastName.type = 'text';
    lastName.value = last_name;
    lastName.name = 'last_name';

    const emailLabel = document.createElement('label');
    form.appendChild(emailLabel);
    emailLabel.htmlFor = 'email';
    emailLabel.className = 'label-upper';
    emailLabel.textContent = 'Email';
    const emailElement = document.createElement('input');
    form.appendChild(emailElement);
    emailElement.type = 'text';
    emailElement.value = email;
    emailElement.name = 'email';

    const roleLabel = document.createElement('label');
    form.appendChild(roleLabel);
    roleLabel.htmlFor = 'role';
    roleLabel.className = 'label-upper';
    roleLabel.textContent = 'Ruolo';
    const roleSelect = document.createElement('select');
    form.appendChild(roleSelect);
    roleSelect.name = 'role_id';
    const roles = await getRoles();
    if (!roles) {
        showToast('Errore', 'Impossibile caricare i ruoli.', 'error');
        resetModal();
        return;
    }

    const clientOpt = document.createElement('option');
    clientOpt.value = 0;
    clientOpt.textContent = 'Cliente';

    if (role == null)
        clientOpt.selected = 1;
    roleSelect.appendChild(clientOpt);

    for (const r of roles) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;

        if (r.id === role) {
            opt.selected = true;
        }
        roleSelect.appendChild(opt);
    }

    const activeBox = document.createElement('div');
    form.appendChild(activeBox);
    const activeElement = document.createElement('input');
    activeBox.appendChild(activeElement);
    activeElement.type = 'checkbox';
    if (is_active)
        activeElement.checked = 1;
    activeElement.name = 'is_active';
    activeElement.id = 'is_active';
    const activeLabel = document.createElement('label');
    activeBox.appendChild(activeLabel);
    activeLabel.htmlFor = 'is_active';
    activeLabel.textContent = ' Utente Attivo';
    activeLabel.classList.add('inline-label');

    const save = document.createElement('button');
    save.type = 'submit';
    save.setAttribute('form', 'edit-user-form');
    save.className = 'btn-md btn-primary';
    save.innerHTML = '<i class="fa-regular fa-floppy-disk btn-icon"></i>Salva';
    addModalFooter(save);


    openModal();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.querySelector('button[type="submit"]');
        button.classList.add('btn-loading');
        const formData = new FormData(event.target); // Prende l'intero oggetto Form

        const payload = Object.fromEntries(formData.entries()); // Trasforma tutti gli input in JSON per passare tramite fetch al server.
        payload.is_active = formData.has('is_active') ? 1 : 0;
        try {
            const res = await fetch('/api/admin/users/' + id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const resJSON = await res.json();
            if (resJSON.success) {
                showToast('Successo', resJSON.message, 'success');
                closeModal();
                resetContent();
                fetchOperators();
            } else {
                showToast('Errore', resJSON.message, 'error');
                stopLoading(button);
            }
        } catch (error) {
            showToast('Errore', "Si è verificato un problema durante la modifica dell'operatore.", 'error');
            stopLoading(button);
        }
    });
}

function openDeleteModal(id, type) {
    let title = '';
    let descText = '';
    let successMsg = '';

    switch (type) {
        case 'users':
            title = 'Elimina Operatore';
            descText = 'Sei sicuro di voler eliminare questo utente?';
            successMsg = 'Utente rimosso con successo.';
            break;
        case 'roles':
            title = 'Elimina Ruolo';
            descText = 'Sei sicuro di voler eliminare questo ruolo?';
            successMsg = 'Ruolo rimosso con successo.';
            break;
        case 'categories':
            title = 'Elimina Categoria';
            descText = 'Sei sicuro di voler eliminare questa categoria?';
            successMsg = 'Categoria rimossa con successo.';
            break;
    }

    setModalTitle(title);
    const desc = document.createElement('p');
    desc.textContent = descText;
    addModalElement(desc);

    const confirm = document.createElement('button');
    confirm.className = 'btn-sm btn-danger';
    confirm.innerHTML = '<i class="fa-solid fa-trash btn-icon"></i>Elimina';
    addModalFooter(confirm);

    openModal(false);

    confirm.addEventListener('click', async (event) => {
        event.preventDefault();

        startLoading(event.target);
        try {
            const options = {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            if (type === 'users') {
                options.body = JSON.stringify({ role_id: 'NULL' });
            }

            const res = await fetch(`/api/admin/${type}/${id}`, options);
            const resJSON = await res.json();

            if (!resJSON.success) {
                showToast('Errore', resJSON.message, 'error');
                stopLoading(event.target);
            } else {
                showToast('Successo', successMsg, 'success');
                resetContent();

                if (type === 'users') fetchOperators();
                else if (type === 'roles') fetchRoles();
                else if (type === 'categories') fetchCategories();

                closeModal();
            }
        } catch (error) {
            showToast('Errore', 'Si è verificato un problema durante la rimozione.', 'error');
            stopLoading(event.target);
            console.error(error);
        }
    });
}

function resetContent() {
    contentArea.innerHTML = '';
}

async function getRoles() {
    try {
        const res = await fetch('/api/admin/roles');
        const resJSON = await res.json();

        if (!resJSON.success)
            return null;

        return resJSON.roles;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getCategories() {
    try {
        const res = await fetch('/api/admin/categories');
        const resJSON = await res.json();

        if (!resJSON.success)
            return null;

        return resJSON.categories;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function loadSelectorSwitch() {
    const selector = document.getElementById('selector');
    const contentButton = document.getElementById('content-button');

    selector.addEventListener('click', (event) => {
        const clicked = event.target.closest('.nav-item');
        if (!clicked)
            return;

        switch (clicked.id) {
            case "operators-switch":
                switchToPage('operators');
                break;
            case "roles-switch":
                switchToPage('roles');
                break;
            case "categories-switch":
                switchToPage('categories');
                break;
        }
    });

    contentButton.addEventListener('click', (event) => {
        event.preventDefault();
        const activePage = contentButton.dataset.page;
        switch (activePage) {
            case "roles":
                openRoleModal();
                break;
            case "categories":
                openCategoryModal();
                break;
        }
    })
}

/*
    ROLES
*/

async function fetchRoles() {
    categoryList = await getCategories();
    roleList = {};
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.id = 'roles-table';
    tableWrapper.appendChild(table);

    const tHead = document.createElement('thead');
    const tr = document.createElement('tr');
    const headers = ['ID', 'Nome', 'Descrizione', 'Admin', 'Azioni'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.className = 'label-upper';
        th.textContent = header;
        tr.appendChild(th);
    });
    tHead.appendChild(tr);
    table.appendChild(tHead);

    const tBody = document.createElement('tbody');
    table.appendChild(tBody);

    contentArea.appendChild(tableWrapper);

    try {
        const res = await fetch('/api/admin/roles');
        const resJSON = await res.json();

        if (!resJSON.success) {
            showToast('Errore', resJSON.message, 'error');
            return;
        }

        for (const role of resJSON.roles) {
            roleList[role.id] = role;

            const roleRow = document.createElement('tr');
            tBody.appendChild(roleRow);

            const id = role.id;
            const name = role.name;
            const description = role.description;
            const isAdmin = role.is_admin;

            roleRow.dataset.role_id = id;

            const tdId = document.createElement('td');
            roleRow.appendChild(tdId);
            tdId.appendChild(getIDBadge(id));

            const tdName = document.createElement('td');
            tdName.appendChild(getUserBadge(name));
            roleRow.appendChild(tdName);

            const tdDescription = document.createElement('td');
            tdDescription.textContent = description;
            roleRow.appendChild(tdDescription);

            const tdAdmin = document.createElement('td');
            if (role.is_admin) {
                tdAdmin.innerHTML = '<i class="fa-regular fa-circle-check"></i>'
                tdAdmin.style.color = 'var(--color-success)';
            } else {
                tdAdmin.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>'
                tdAdmin.style.color = 'var(--color-error)';
            }
            roleRow.appendChild(tdAdmin);

            const tdActions = document.createElement('td');
            const tdActionsWrapper = document.createElement('div');
            tdActionsWrapper.classList.add('table-actions');
            tdActions.appendChild(tdActionsWrapper);
            const editAction = document.createElement('div');
            editAction.className = 'btn-sm btn-ghost btn-edit-role';
            editAction.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
            tdActionsWrapper.appendChild(editAction);
            const deleteAction = document.createElement('div');
            deleteAction.className = 'btn-sm btn-ghost btn-delete-role';
            deleteAction.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteAction.style.color = 'var(--color-error)';
            tdActionsWrapper.appendChild(deleteAction);
            roleRow.append(tdActions);
        }

        loadRolesActions();
    } catch (error) {
        showToast('Errore', 'Si è verificato un errore durante il caricamento delle categorie.', 'error');
        console.error(error);
    }

}


function loadRolesActions() {
    const table = document.getElementById('roles-table');

    table.addEventListener('click', (event) => {
        const clicked = event.target.closest('.btn-edit-role, .btn-delete-role');
        if (!clicked)
            return;

        const roleRow = clicked.closest('tr');
        const roleID = roleRow.dataset.role_id;

        if (clicked.classList.contains('btn-edit-role')) {
            openRoleModal(roleID, roleList[roleID].name, roleList[roleID].description, roleList[roleID].is_admin);
        } else if (clicked.classList.contains('btn-delete-role')) {
            openDeleteModal(roleID, 'roles');
        }
    });
}

async function openRoleModal(id = null, name = '', description = '', is_admin = false) {
    if (id != null) {
        setModalTitle('Modifica Ruolo');
    } else {
        setModalTitle('Nuovo Ruolo');
    }

    const form = document.createElement('form');
    addModalElement(form);
    if (id !== null)
        form.id = 'edit-role-form';
    else
        form.id = 'new-role-form';

    const nameLabel = document.createElement('label');
    form.appendChild(nameLabel);
    nameLabel.htmlFor = 'name';
    nameLabel.className = 'label-upper';
    nameLabel.textContent = 'Nome';
    const nameElement = document.createElement('input');
    form.appendChild(nameElement);
    nameElement.type = 'text';
    nameElement.value = name;
    nameElement.name = 'name';
    nameElement.id = 'name';

    const descriptionLabel = document.createElement('label');
    form.appendChild(descriptionLabel);
    descriptionLabel.htmlFor = 'description';
    descriptionLabel.className = 'label-upper';
    descriptionLabel.textContent = 'Descrizione';
    const descriptionElement = document.createElement('input');
    form.appendChild(descriptionElement);
    descriptionElement.type = 'text';
    descriptionElement.value = description;
    descriptionElement.name = 'description';

    let categoryIds = [];
    if (id != null)
        categoryIds = roleList[id].categories.map(cat => cat.id);

    const categoriesLabel = document.createElement('label');
    form.appendChild(categoriesLabel);
    categoriesLabel.htmlFor = 'categories';
    categoriesLabel.classList = 'label-upper';
    categoriesLabel.textContent = 'Categorie Abilitate';

    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'modal-category-list';
    form.appendChild(categoriesContainer);

    categoriesContainer.appendChild(generateTree(categoryList)[0]);


    const adminBox = document.createElement('div');
    form.appendChild(adminBox);
    const adminElement = document.createElement('input');
    adminBox.appendChild(adminElement);
    adminElement.type = 'checkbox';
    if (is_admin)
        adminElement.checked = 1;
    adminElement.name = 'is_admin';
    adminElement.id = 'is_admin';
    const adminLabel = document.createElement('label');
    adminBox.appendChild(adminLabel);
    adminLabel.htmlFor = 'is_admin';
    adminLabel.textContent = ' Admin';
    adminLabel.classList.add('inline-label');

    const button = document.createElement('button');
    button.type = 'submit';
    if (id) {
        button.setAttribute('form', 'edit-role-form');
        button.innerHTML = '<i class="fa-regular fa-floppy-disk btn-icon"></i>Salva';
    } else {
        button.setAttribute('form', 'new-role-form');
        button.innerHTML = '<i class="fa-regular fa-plus btn-icon"></i>Crea Ruolo';
    }
    button.className = 'btn-md btn-primary';
    addModalFooter(button);

    categoriesContainer.addEventListener('change', (event) => {
        if (!event.target.matches('input[type="checkbox"]'))
            return;

        const checkbox = event.target;
        const parentLi = checkbox.closest('.tree-node');

        const isChecked = checkbox.checked;
        const childrenCheckboxes = parentLi.querySelectorAll('.tree-children input[type="checkbox"]');
        childrenCheckboxes.forEach(child => {
            child.checked = isChecked;
            child.indeterminate = false;
        });

        updateParentStatus(parentLi);

        // Funzione ricorsiva per risalire l'albero
        function updateParentStatus(li) {
            const parentUl = li.parentElement;
            if (!parentUl.classList.contains('tree-children')) // Siamo alla radice
                return;

            const currentParentLi = parentUl.closest('.tree-node');
            if (!currentParentLi)
                return;

            const parentCheckbox = currentParentLi.querySelector(':scope > .tree-content input[type="checkbox"]');
            // Ritorna array di tutte le checkbox solo allo stesso livello (non scende dentro le UL annidate)
            const siblingCheckboxes = Array.from(parentUl.querySelectorAll(':scope > .tree-node > .tree-content > .inline-label > input[type="checkbox"]'));

            const total = siblingCheckboxes.length;
            const checkedCount = siblingCheckboxes.filter(cb => cb.checked).length;
            const indeterminateCount = siblingCheckboxes.filter(cb => cb.indeterminate).length;

            if (checkedCount === total && total > 0) {
                parentCheckbox.checked = true;
                parentCheckbox.indeterminate = false;
            } else if (checkedCount > 0 || indeterminateCount > 0) {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = true;
            } else {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = false;
            }

            // Risale al livello superiore
            updateParentStatus(currentParentLi);
        }
    });

    openModal();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.querySelector('button[type="submit"]');
        button.classList.add('btn-loading');
        const formData = new FormData(event.target); // Prende l'intero oggetto Form

        const payload = Object.fromEntries(formData.entries()); // Trasforma tutti gli input in JSON per passare tramite fetch al server.

        // Ottiene tutte le checkbox delle categorie spuntate (necessario perché Object.fromEntries prende solo l'ultimo valore)
        payload.category_ids = formData.getAll('category_ids');

        payload.is_admin = formData.has('is_admin') ? true : false;

        // Imposta metodo e url dinamici in base all'azione
        const method = id !== null ? 'PUT' : 'POST';
        const url = id !== null ? '/api/admin/roles/' + id : '/api/admin/roles';
        const actionText = id !== null ? 'modifica' : 'creazione';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const resJSON = await res.json();
            if (resJSON.success) {
                showToast('Successo', resJSON.message, 'success');
                closeModal();
                resetContent();
                fetchRoles();
            } else {
                showToast('Errore', resJSON.message, 'error');
                stopLoading(button);
            }
        } catch (error) {
            showToast('Errore', `Si è verificato un problema durante la ${actionText} del ruolo.`, 'error');
            stopLoading(button);
        }
    });

    function generateTree(categories) {
        const ul = document.createElement('ul');
        ul.className = 'category-tree';

        let checked = 0;
        let total = 0;

        for (const cat of categories) {
            total++;
            const li = document.createElement('li');
            li.className = 'tree-node';

            const content = document.createElement('div');
            content.className = 'tree-content';

            const label = document.createElement('label');
            label.classList.add('inline-label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'category_ids';
            checkbox.value = cat.id;
            if (categoryIds.includes(cat.id)) {
                checked++;
                checkbox.checked = true;
            }

            label.appendChild(checkbox);
            label.append(' ' + cat.name);

            content.appendChild(label);
            li.appendChild(content);

            if (cat.children && cat.children.length > 0) {
                const res = generateTree(cat.children);
                const childrenUl = res[0];
                childrenUl.className = 'tree-children';
                li.appendChild(childrenUl);
                if (res[1] == 1)
                    checkbox.checked = true;
                else if (res[1] == 2)
                    checkbox.indeterminate = true;
            }

            ul.appendChild(li);
        }

        let statusCode = 0;
        if (checked > 0)
            statusCode = 2;
        if (checked === total)
            statusCode = 1;

        return [ul, statusCode];
    }
}


/*
    CATEGORIES
*/

async function fetchCategories() {
    categoryList = await getCategories();
    const flatCategoryMap = {}; // Per accesso rapido (flatCategoryMap.catId)
    const flatCategoriesList = []; // Per liste ordinate gerarchicamente

    function flattenCategories(categories, level = 0) { // Level = profondità, per gestione grafica
        for (const cat of categories) {
            const catData = { ...cat, level: level };
            flatCategoryMap[cat.id] = catData;
            flatCategoriesList.push(catData);
            if (cat.children && cat.children.length > 0) {
                flattenCategories(cat.children, level + 1);
            }
        }
    }

    if (categoryList) {
        flattenCategories(categoryList);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.id = 'categories-table';
    tableWrapper.appendChild(table);

    const tHead = document.createElement('thead');
    const tr = document.createElement('tr');
    const headers = ['ID', 'Nome', 'Attiva', 'Azioni'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.className = 'label-upper';
        th.textContent = header;
        tr.appendChild(th);
    });
    tHead.appendChild(tr);
    table.appendChild(tHead);

    const tBody = document.createElement('tbody');
    table.appendChild(tBody);

    contentArea.appendChild(tableWrapper);

    if (!categoryList) {
        return;
    }

    for (const cat of flatCategoriesList) {
        const catRow = document.createElement('tr');
        tBody.appendChild(catRow);

        const id = cat.id;
        const name = cat.name;
        const isActive = cat.is_active;

        catRow.dataset.category_id = id;

        const tdId = document.createElement('td');
        catRow.appendChild(tdId);
        tdId.appendChild(getIDBadge(id));

        const tdName = document.createElement('td');
        const nameWrapper = document.createElement('div');
        nameWrapper.style.display = 'flex';
        nameWrapper.style.alignItems = 'center';

        if (cat.level > 0) {
            nameWrapper.style.paddingLeft = `${cat.level * 1.5}em`;
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-arrow-turn-up fa-rotate-90';
            icon.style.color = 'var(--color-text-muted)';
            icon.style.marginRight = '8px';
            nameWrapper.appendChild(icon);
        } else {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-folder';
            icon.style.color = 'var(--color-text-secondary)';
            icon.style.marginRight = '8px';
            nameWrapper.appendChild(icon);
        }

        nameWrapper.appendChild(getUserBadge(name));
        tdName.appendChild(nameWrapper);
        catRow.appendChild(tdName);

        const tdActive = document.createElement('td');
        if (isActive) {
            tdActive.innerHTML = '<i class="fa-regular fa-circle-check"></i>'
            tdActive.style.color = 'var(--color-success)';
        } else {
            tdActive.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>'
            tdActive.style.color = 'var(--color-error)';
        }
        catRow.appendChild(tdActive);

        const tdActions = document.createElement('td');
        const tdActionsWrapper = document.createElement('div');
        tdActionsWrapper.classList.add('table-actions');
        tdActions.appendChild(tdActionsWrapper);
        const editAction = document.createElement('div');
        editAction.className = 'btn-sm btn-ghost btn-edit-category';
        editAction.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        tdActionsWrapper.appendChild(editAction);
        const deleteAction = document.createElement('div');
        deleteAction.className = 'btn-sm btn-ghost btn-delete-category';
        deleteAction.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteAction.style.color = 'var(--color-error)';
        tdActionsWrapper.appendChild(deleteAction);
        catRow.append(tdActions);
    }

    loadCategoriesActions(flatCategoryMap);
}

function loadCategoriesActions(flatCategoryMap) {
    const table = document.getElementById('categories-table');

    table.addEventListener('click', (event) => {
        const clicked = event.target.closest('.btn-edit-category, .btn-delete-category');
        if (!clicked)
            return;

        const catRow = clicked.closest('tr');
        const catID = catRow.dataset.category_id;

        if (clicked.classList.contains('btn-edit-category')) {
            const cat = flatCategoryMap[catID];
            openCategoryModal(cat.id, cat.name, cat.parent_id, cat.is_active, flatCategoryMap);
        } else if (clicked.classList.contains('btn-delete-category')) {
            openDeleteModal(catID, 'categories');
        }
    });
}

async function openCategoryModal(id = null, name = '', parent_id = null, is_active = true, flatCategoryMap = null) {
    if (id != null) {
        setModalTitle('Modifica Categoria');
    } else {
        setModalTitle('Nuova Categoria');
    }

    const form = document.createElement('form');
    addModalElement(form);
    if (id !== null)
        form.id = 'edit-category-form';
    else
        form.id = 'new-category-form';

    const nameLabel = document.createElement('label');
    form.appendChild(nameLabel);
    nameLabel.htmlFor = 'name';
    nameLabel.className = 'label-upper';
    nameLabel.textContent = 'Nome';
    const nameElement = document.createElement('input');
    form.appendChild(nameElement);
    nameElement.type = 'text';
    nameElement.value = name;
    nameElement.name = 'name';
    nameElement.id = 'name';

    const parentLabel = document.createElement('label');
    form.appendChild(parentLabel);
    parentLabel.htmlFor = 'parent_id';
    parentLabel.className = 'label-upper';
    parentLabel.textContent = 'Categoria Padre';
    const parentSelect = document.createElement('select');
    form.appendChild(parentSelect);
    parentSelect.name = 'parent_id';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Nessuna (Categoria Radice)';
    if (parent_id == null) {
        defaultOpt.selected = true;
    }
    parentSelect.appendChild(defaultOpt);

    if (!flatCategoryMap && categoryList) {
        flatCategoryMap = {};
        function flattenCategories(categories) {
            for (const cat of categories) {
                flatCategoryMap[cat.id] = cat;
                if (cat.children && cat.children.length > 0) {
                    flattenCategories(cat.children);
                }
            }
        }
        flattenCategories(categoryList);
    }

    if (flatCategoryMap) {
        for (const cat of Object.values(flatCategoryMap)) {
            if (id !== null && cat.id == id) continue;

            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;

            if (cat.id == parent_id) {
                opt.selected = true;
            }
            parentSelect.appendChild(opt);
        }
    }

    const activeBox = document.createElement('div');
    form.appendChild(activeBox);
    const activeElement = document.createElement('input');
    activeBox.appendChild(activeElement);
    activeElement.type = 'checkbox';
    if (is_active)
        activeElement.checked = true;
    activeElement.name = 'is_active';
    activeElement.id = 'is_active';
    const activeLabel = document.createElement('label');
    activeBox.appendChild(activeLabel);
    activeLabel.htmlFor = 'is_active';
    activeLabel.textContent = ' Categoria Attiva';
    activeLabel.classList.add('inline-label');

    const button = document.createElement('button');
    button.type = 'submit';
    if (id) {
        button.setAttribute('form', 'edit-category-form');
        button.innerHTML = '<i class="fa-regular fa-floppy-disk btn-icon"></i>Salva';
    } else {
        button.setAttribute('form', 'new-category-form');
        button.innerHTML = '<i class="fa-regular fa-plus btn-icon"></i>Crea Categoria';
    }
    button.className = 'btn-md btn-primary';
    addModalFooter(button);

    openModal();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.classList.add('btn-loading');
        const formData = new FormData(event.target);

        const payload = Object.fromEntries(formData.entries());
        payload.is_active = formData.has('is_active') ? 1 : 0;
        if (payload.parent_id === '') {
            payload.parent_id = null;
        }

        const method = id !== null ? 'PUT' : 'POST';
        const url = id !== null ? '/api/admin/categories/' + id : '/api/admin/categories';
        const actionText = id !== null ? 'modifica' : 'creazione';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const resJSON = await res.json();
            if (resJSON.success) {
                showToast('Successo', resJSON.message, 'success');
                closeModal();
                resetContent();
                fetchCategories();
            } else {
                showToast('Errore', resJSON.message, 'error');
                stopLoading(submitBtn);
            }
        } catch (error) {
            showToast('Errore', `Si è verificato un problema durante la ${actionText} della categoria.`, 'error');
            stopLoading(submitBtn);
        }
    });
}
