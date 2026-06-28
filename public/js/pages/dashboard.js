let ticketsContainer;
let limit;
let page = 1;
let orderBy = 'desc';
let filter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    ticketsContainer = document.getElementById('ticket-list');

    loadStats();
    renderTickets();
    loadStatusFilterListener();
    loadOrderByListener();
    loadPageLimitListener();
    loadTicketOpenListener();
});



async function loadStats() {
    const pending = document.getElementById('pending-value');
    const inProgress = document.getElementById('in-progress-value');
    const resolved = document.getElementById('resolved-value');
    const total = document.getElementById('total-value');
    
    try {
        const res = await fetch('/api/tickets/my/stats');
        const resJSON = await res.json();

        const pendingValue = resJSON.stats[0].count;
        const inProgressValue = resJSON.stats[1].count;
        const resolvedValue = resJSON.stats[2].count;
        const archivedValue = resJSON.stats[3].count;

        pending.textContent = pendingValue;
        inProgress.textContent = inProgressValue;
        resolved.textContent = resolvedValue;
        total.textContent = pendingValue + inProgressValue + resolvedValue + archivedValue;

    } catch(error) {

    }
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
        if(!clicked)
            return;

        if(clicked.classList.contains('btn-ghost-selected')) return;

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
        if(!clicked)
            return;

        window.location.href = '/ticket/' + clicked.dataset.ticket_id;
    });
}


async function renderTickets(limit = 10, page = 1, orderBy = 'desc', filter = 'all', search = "") {
    try {
        const res = await fetch(`/api/tickets/my?limit=${limit}&page=${page}&sort=${orderBy}&status=${filter}&search=${search}`);
        const resJSON = await res.json();
        if(!resJSON.success) {
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

        const fragment = document.createDocumentFragment();

        for(const ticket of tickets) {
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
    } catch(error) {
        showToast('Errore', "Impossibile caricare la lista dei ticket." + error, 'error');
    }
}