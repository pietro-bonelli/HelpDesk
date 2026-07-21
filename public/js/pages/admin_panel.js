let contentArea;

document.addEventListener('DOMContentLoaded', () => {
    contentArea = document.getElementById('content-area');

    switchToPage('operators');
});

function fetchOperators() {
    let scroll;
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.id = 'operators-table';
    tableWrapper.appendChild(table);

    const tr = document.createElement('tr');
    const thId = document.createElement('th');
    thId.classList.add('label-upper');
    thId.textContent = 'ID';
    const thName = document.createElement('th');
    thName.classList.add('label-upper');
    thName.textContent = 'Nome';
    const thSurname = document.createElement('th');
    thSurname.classList.add('label-upper');
    thSurname.textContent = 'Cognome';
    const thEmail = document.createElement('th');
    thEmail.classList.add('label-upper');
    thEmail.textContent = 'Email';
    const thRole = document.createElement('th');
    thRole.classList.add('label-upper');
    thRole.textContent = 'Ruolo';
    const thActions = document.createElement('th');
    thActions.classList.add('label-upper');
    thActions.textContent = '';

    tr.appendChild(thId);
    tr.appendChild(thName);
    tr.appendChild(thSurname);
    tr.appendChild(thEmail);
    tr.appendChild(thRole);
    tr.appendChild(thActions);
    table.appendChild(tr);

    const trigger = document.createElement('div');
    trigger.classList = 'spinner';
    trigger.id = 'infinite-scroll-trigger';
    contentArea.appendChild(table);
    contentArea.appendChild(trigger);

    scroll = new InfiniteScroll(trigger, async (nextPage) => {
        const res = await fetch('/api/admin/users?page=' + nextPage);
        const resJSON = await res.json();

        for(const user of resJSON.users) {
            const id = user.id;
            const first_name = user.first_name;
            const last_name = user.last_name;
            const email = user.email;
            const role = user.role_name;

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
            const tdActions = document.createElement('td');
            tdActions.textContent = 'A1 A2';
            document.body.append(getUserBadge('admin'));

            table.appendChild(tdId);
            table.appendChild(tdFirstName);
            table.appendChild(tdLastName);
            table.appendChild(tdEmail);
            table.appendChild(tdRole);
            table.appendChild(tdActions);
        }

        return (resJSON.users.length < 10);
    });
}

function switchToPage(page) {
    resetContent();
    const nav = document.getElementById('selector');
    for(const e of nav.children) {
        if(e.classList.contains('nav-item'))
            e.classList.remove('active');
    }
    switch(page) {
        case 'operators':
            const operatorsSwitch = document.getElementById('operators-switch');
            operatorsSwitch.classList.add('active');
            fetchOperators();
            break;
        case 'roles':
            const rolesSwitch = document.getElementById('roles-switch');
            rolesSwitch.classList.add('active');
            break;
        case 'categories':
            const categoriesSwitch = document.getElementById('categories-switch');
            categoriesSwitch.classList.add('active');
            break;
    }
}

function resetContent() {
    contentArea.innerHTML = '';
}