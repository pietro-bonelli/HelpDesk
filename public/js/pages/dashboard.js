let ticketsContainer;
let limit = 10;
let page = 1;
let orderBy = 'desc';
let filter = 'all';
let search = '';
let totalCount = 0;

let categories;

let userData;

document.addEventListener('DOMContentLoaded', async () => {
    ticketsContainer = document.getElementById('ticket-list');

    categories = await getCategories();
    await loadUserData();

    loadStats();
    renderTickets();
    loadStatusFilterListener();
    loadOrderByListener();
    loadPageLimitListener();
    loadTicketOpenListener();
    loadSearchBarListener();
    loadPageSwitchListener();
    newTicketListener();
});

async function loadUserData() {
    if (!userData) {
        const res = await fetch(`/api/users/me`);
        const resJSON = await res.json();

        if (!resJSON.success) {
            showToast('Errore', 'Si è verificato un problema nel recuperare le informazioni utente.', 'error');
        } else {
            userData = resJSON.user;
        }
    }
}

function loadCreateTicketListener() {
    const form = document.getElementById('create-ticket-form');
    console.log(form);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const titleElement = form.querySelector('input[name="title"]');
        const priorityElement = form.querySelector('select[name="priority"]');
        const categoryId = form.dataset.category_id;
        const description = form.querySelector('input[name="ticket-message"]');

        const button = document.getElementById('create-ticket-button');
        button.classList.add('btn-loading');
        await createTicket(titleElement.value, priorityElement.value, categoryId, description.value);
        closeModal();

        renderTickets(limit, page, orderBy, filter, search);
    });
}

async function createTicket(title, priority, categoryId, description) {
    console.log(title + " " + priority + " " + categoryId + " " + description);
    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                "title": title,
                "priority": priority,
                "category_id": categoryId,
                "message_text": description
            })
        });

        const resJSON = await res.json();
        if (!resJSON.success) {
            showToast('Impossibile creare il ticket', resJSON.message, 'error');
            return;
        } else {
            showToast('Successo', resJSON.message, 'success');
        }
    } catch (error) {
        showToast('Errore', 'Si è verificato un problema durante la creazione del ticket.', 'error');
    }
}

function loadCategorySelectListener() {
    const modal = document.getElementById('modal-overlay');

    modal.addEventListener('change', (event) => {
        const clicked = event.target;
        if (!clicked.classList.contains('category-selector'))
            return;

        const sub = clicked.dataset.sub;

        const form = modal.querySelector('form');
        form.dataset.category_id = "";
        for (const subCat of form.children) {
            if (subCat.classList.contains('category-selector') && subCat.dataset.sub > sub)
                subCat.remove();
        }

        const children = getChildrenCategories(clicked.value, categories);
        if (children && children.length > 0) {
            const categorySelect = document.createElement('select');
            categorySelect.setAttribute('name', 'category-' + parseInt(sub) + 1);
            categorySelect.required = true;
            categorySelect.classList.add('category-selector');
            categorySelect.dataset.sub = parseInt(sub) + 1;
            const defaultOpt = document.createElement('option');
            defaultOpt.selected = true;
            defaultOpt.disabled = true;
            defaultOpt.hidden = true;
            defaultOpt.value = '';
            defaultOpt.textContent = "Seleziona un'opzione...";
            categorySelect.appendChild(defaultOpt);
            for (const cat of children) {
                const opt = document.createElement('option');
                opt.setAttribute('value', cat.id);
                opt.textContent = cat.name;
                categorySelect.appendChild(opt);
            }
            clicked.after(categorySelect);

        } else {
            form.dataset.category_id = clicked.value;
        }

    });
}


function openNewTicketModal() {
    if (!categories) {
        showToast('Errore', 'Impossibile recuperare la lista categorie.', 'error');
    }
    setModalTitle("Nuovo Ticket");

    const form = document.createElement('form');
    form.id = 'create-ticket-form';
    form.dataset.loading = true;

    const titleLabel = document.createElement('label');
    titleLabel.setAttribute('for', 'title');
    titleLabel.textContent = 'Titolo';
    form.appendChild(titleLabel);

    const title = document.createElement('input');
    title.setAttribute('name', 'title');
    title.setAttribute('placeholder', 'Il PC non si accende');
    title.required = true;
    form.appendChild(title);

    const priorityLabel = document.createElement('label');
    priorityLabel.setAttribute('for', 'priority');
    priorityLabel.textContent = 'Priorità';
    form.appendChild(priorityLabel);

    const prioritySelect = document.createElement('select');
    prioritySelect.setAttribute('name', 'priority');

    const low = document.createElement('option');
    low.setAttribute('value', 'low');
    low.innerHTML = 'Bassa';
    prioritySelect.appendChild(low);

    const medium = document.createElement('option');
    medium.setAttribute('value', 'medium');
    medium.innerHTML = 'Media';
    prioritySelect.appendChild(medium);

    const high = document.createElement('option');
    high.setAttribute('value', 'high');
    high.innerHTML = 'Alta';
    prioritySelect.appendChild(high);

    form.appendChild(prioritySelect);

    const categoryLabel = document.createElement('label');
    categoryLabel.setAttribute('for', 'category');
    categoryLabel.textContent = 'Categoria';
    form.appendChild(categoryLabel);

    const categorySelect = document.createElement('select');
    categorySelect.setAttribute('name', 'category');
    categorySelect.required = true;
    categorySelect.classList.add('category-selector');
    categorySelect.dataset.sub = 1;
    const defaultOpt = document.createElement('option');
    defaultOpt.selected = true;
    defaultOpt.disabled = true;
    defaultOpt.hidden = true;
    defaultOpt.value = '';
    defaultOpt.textContent = "Seleziona un'opzione...";
    categorySelect.appendChild(defaultOpt);
    for (const cat of categories) {
        const opt = document.createElement('option');
        opt.setAttribute('value', cat.id);
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
    }
    form.appendChild(categorySelect);

    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Descrizione del problema';
    form.appendChild(descriptionLabel);
    form.appendChild(getTextAreaElement('ticket-message'));

    addModalElement(form);

    const createButton = document.createElement('button');
    createButton.type = 'submit';

    createButton.className = 'btn-primary btn-md';
    createButton.innerHTML = '<i class="btn-icon fa-solid fa-plus"></i>Crea Ticket';
    createButton.id = 'create-ticket-button';
    createButton.setAttribute('form', 'create-ticket-form');

    addModalFooter(createButton);
    openModal();

    loadCategorySelectListener();
    loadCreateTicketListener();
}

async function getCategories() {
    try {
        const res = await fetch('/api/tickets/categories');
        const resJSON = await res.json();

        return resJSON.categories;
    } catch (error) {
        showToast('Errore', 'Impossibile recuperare la lista categorie', 'error');
        return null;
    }
}

function newTicketListener() {
    const button = document.getElementById('new-ticket');

    button.addEventListener('click', (event) => {
        openNewTicketModal();
    });
}

async function loadStats() {
    const dateElement = document.getElementById('date');
    dateElement.textContent = getCurrentDateFormatted();

    const usernameElement = document.getElementById('user-first-name');
    usernameElement.textContent = userData.first_name;

    const pending = document.getElementById('pending-value');
    const inProgress = document.getElementById('in-progress-value');
    const resolved = document.getElementById('resolved-value');
    const total = document.getElementById('total-value');

    try {
        const res = await fetch('/api/tickets/my/stats');
        const resJSON = await res.json();
        console.log(resJSON)

        let pendingValue = 0;
        let inProgressValue = 0;
        let resolvedValue = 0;
        let archivedValue = 0;
        if (resJSON.stats) {
            for (const stat of resJSON.stats) {
                if (stat.status === 'pending') pendingValue = stat.count;
                else if (stat.status === 'in_progress') inProgressValue = stat.count;
                else if (stat.status === 'resolved') resolvedValue = stat.count;
                else if (stat.status === 'archived') archivedValue = stat.count;
            }
        }

        pending.textContent = pendingValue;
        inProgress.textContent = inProgressValue;
        resolved.textContent = resolvedValue;
        total.textContent = pendingValue + inProgressValue + resolvedValue + archivedValue;

    } catch (error) {
        console.error(error);
    }
}

function loadPageSwitchListener() {
    const container = document.getElementById('pages');
    container.addEventListener('click', (event) => {
        const clicked = event.target.closest('.page-icon');
        if (!clicked)
            return;

        if (clicked.id === 'page-previous' && page > 1) {
            page--;
            renderTickets(limit, page, orderBy, filter, search);
            window.location.href = '#ticket-section';
        } else if (clicked.id === 'page-next' && (limit * page) < totalCount) {
            page++;
            renderTickets(limit, page, orderBy, filter, search);
            window.location.href = '#ticket-section';
        }
    });
}

function loadSearchBarListener() {
    const searchBar = document.getElementById('search-ticket');

    let debounceTimer;

    searchBar.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            search = event.target.value.trim();

            renderTickets(limit, page, orderBy, filter, search);
        }, 500); // si esegue con 500ms di ritardo e solo se non ci sono altri input nel frattempo
    });
}

function loadPageLimitListener() {
    const pageLimitElement = document.getElementById('page-limit');

    pageLimitElement.addEventListener('change', (event) => {
        limit = event.target.value;
        page = 1;
        renderTickets(limit, page, orderBy, filter);
    });
}

function loadOrderByListener() {
    const orderByElement = document.getElementById('order-by');

    orderByElement.addEventListener('change', (event) => {
        orderBy = event.target.value;

        page = 1;
        renderTickets(limit, page, orderBy, filter);
    });
}

function loadStatusFilterListener() {
    const statusFilterContainer = document.getElementById('filters');

    statusFilterContainer.addEventListener('click', (event) => {
        const clicked = event.target.closest('.btn-xs');
        if (!clicked)
            return;

        if (clicked.classList.contains('btn-ghost-selected')) return;

        const allSwitches = statusFilterContainer.querySelectorAll('.btn-xs');
        allSwitches.forEach(btn => btn.classList.remove('btn-ghost-selected'));

        clicked.classList.add('btn-ghost-selected');

        filter = clicked.dataset.value;
        page = 1;

        renderTickets(limit, page, orderBy, filter);
    })
}

function loadTicketOpenListener() {

    ticketsContainer.addEventListener('click', (event) => {
        const clicked = event.target.closest('.ticket');
        if (!clicked)
            return;

        window.location.href = '/ticket/' + clicked.dataset.ticket_id;
    });
}


async function renderTickets(limit = 10, page = 1, orderBy = 'desc', filter = 'all', search = "") {
    try {
        const res = await fetch(`/api/tickets/my?limit=${limit}&page=${page}&sort=${orderBy}&status=${filter}&search=${search}`);
        const resJSON = await res.json();
        if (!resJSON.success) {
            showToast('Errore', resJSON.message, 'error');
            return;
        }


        const tickets = resJSON.tickets;

        const minNum = document.getElementById('min-num');
        const maxNum = document.getElementById('max-num');
        const totalNum = document.getElementById('total-num');
        minNum.textContent = (resJSON.totalCount > 0 ? ((page - 1) * limit + 1) : 0);
        maxNum.textContent = (page - 1) * limit + tickets.length;
        totalNum.textContent = resJSON.totalCount;
        totalCount = resJSON.totalCount;

        const pageNum = document.getElementById('page-number');
        pageNum.textContent = page;
        const pagePrev = document.getElementById('page-previous');
        const pageNext = document.getElementById('page-next');
        pagePrev.classList.remove('disabled');
        pageNext.classList.remove('disabled');
        if (page === 1) {
            pagePrev.classList.add('disabled');
        }
        if (limit * page >= totalCount) {
            pageNext.classList.add('disabled');
        }

        const fragment = document.createDocumentFragment();

        for (const ticket of tickets) {
            const e = document.createElement('article');
            e.classList.add('ticket');
            e.dataset.ticket_id = ticket.id;

            const ticketData = document.createElement('div');
            ticketData.classList.add('ticket-data');
            const idBadge = getIDBadge(ticket.id);
            ticketData.appendChild(idBadge);
            const priorityBadge = getPriorityBadge(ticket.priority, 'Priorità');
            ticketData.appendChild(priorityBadge);
            e.appendChild(ticketData);

            const ticketDescription = document.createElement('div');
            ticketDescription.className = 'ticket-description';
            const ticketTitle = document.createElement('p');
            ticketTitle.className = 'ticket-title';
            ticketTitle.textContent = ticket.title;
            ticketDescription.appendChild(ticketTitle);

            const ticketInfo = document.createElement('p');
            ticketInfo.className = "small ticket-info";
            ticketInfo.textContent = ticket.category_names.join(' • ');
            ticketDescription.appendChild(ticketInfo);
            e.appendChild(ticketDescription);

            const ticketManage = document.createElement('div');
            ticketManage.className = 'ticket-manage';

            const ticketManageInfo = document.createElement('div');
            ticketManageInfo.className = 'ticket-manage-info';
            const statusBadge = getStatusBadge(ticket.status);
            ticketManageInfo.appendChild(statusBadge);
            const ticketCreationDate = document.createElement('p');
            ticketCreationDate.className = 'ticket-creation-date small';
            ticketCreationDate.textContent = formatRelativeDate(ticket.created_at);
            ticketManageInfo.appendChild(ticketCreationDate);
            ticketManage.appendChild(ticketManageInfo);

            const button = document.createElement('button');
            button.className = 'btn-md btn-secondary';
            button.innerHTML = 'Apri <i class="fa-solid fa-arrow-right btn-icon"></i>';
            ticketManage.appendChild(button);
            e.appendChild(ticketManage);

            fragment.append(e);
        }
        ticketsContainer.innerHTML = '';
        ticketsContainer.appendChild(fragment);
    } catch (error) {
        showToast('Errore', "Impossibile caricare la lista dei ticket." + error, 'error');
    }
}

function getChildrenCategories(targetId, categories) {
    console.log(categories);
    for (const cat of categories) {
        if (cat.id == targetId)
            return cat.children;

        if (cat.children && cat.children.length > 0) {
            const found = getChildrenCategories(targetId, cat.children);
            if (found !== null)
                return found;
        }
    }

    return null;
}