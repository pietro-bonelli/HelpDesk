let ticketsContainer;
let filter = 'all';
let search = '';

let userData;
let infiniteScroll;

document.addEventListener('DOMContentLoaded', async () => {
    ticketsContainer = document.getElementById('ticket-list');

    await loadUserData();

    loadStats();
    loadCategories();
    renderTickets();
    loadStatusFilterListener();
    loadSearchBarListener();
    loadTicketActionListener();
});

async function loadUserData() {
    if (!userData) {
        const res = await fetch(`/api/users/me`);
        const resJSON = await res.json();

        if (!resJSON.success) {
            showToast('Errore', 'Si è verificato un problema nel recuperare le informazioni utente.', 'error');
        } else {
            userData = resJSON.user;
            
            const dateElement = document.getElementById('date');
            dateElement.textContent = getCurrentDateFormatted();

            const usernameElement = document.getElementById('user-first-name');
            usernameElement.textContent = userData.first_name;
        }
    }
}

function loadCategories() {
    const enabledCategories = document.getElementById('enabled-categories');
    if(userData && userData.categories) {
        for(const cat of userData.categories) {
            const badge = getUserBadge(cat.category_name);
            enabledCategories.appendChild(badge);
        }
    }
}

async function loadStats() {
    const pending = document.getElementById('pending-value');
    const inProgress = document.getElementById('in-progress-value');
    const resolved = document.getElementById('resolved-value');

    try {
        const res = await fetch('/api/tickets/operator/stats');
        const resJSON = await res.json();

        let pendingValue = 0;
        let inProgressValue = 0;
        let resolvedValue = 0;
        if (resJSON.stats) {
            for (const stat of resJSON.stats) {
                if (stat.status === 'pending') pendingValue = stat.count;
                else if (stat.status === 'in_progress') inProgressValue = stat.count;
                else if (stat.status === 'resolved') resolvedValue = stat.count;
            }
        }

        pending.textContent = pendingValue;
        inProgress.textContent = inProgressValue;
        resolved.textContent = resolvedValue;
    } catch (error) {
        console.error(error);
    }
}


function loadSearchBarListener() {
    const searchBar = document.getElementById('search-ticket');
    let debounceTimer;

    searchBar.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            search = event.target.value.trim();
            renderTickets();
        }, 500); 
    });
}



function loadStatusFilterListener() {
    const statusFilterContainer = document.getElementById('filters');

    statusFilterContainer.addEventListener('click', (event) => {
        const clicked = event.target.closest('.btn-xs');
        if (!clicked) return;
        if (clicked.classList.contains('btn-ghost-selected')) return;

        const allSwitches = statusFilterContainer.querySelectorAll('.btn-xs');
        allSwitches.forEach(btn => btn.classList.remove('btn-ghost-selected'));

        clicked.classList.add('btn-ghost-selected');

        filter = clicked.dataset.value || 'all';
        renderTickets();
    })
}

function loadTicketActionListener() {
    ticketsContainer.addEventListener('click', async (event) => {
        const takeButton = event.target.closest('.btn-take');
        const openButton = event.target.closest('.btn-open');
        const ticketDiv = event.target.closest('.ticket');

        if(takeButton && ticketDiv) {
            event.stopPropagation();
            const ticketId = ticketDiv.dataset.ticket_id;
            takeButton.classList.add('btn-loading');
            
            try {
                const res = await fetch('/api/tickets/' + ticketId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'in_progress', operator_id: userData.id })
                });
                const resJSON = await res.json();
                
                if(resJSON.success) {
                    showToast('Successo', 'Ticket preso in carico.', 'success');
                    window.location.href = '/ticket/' + ticketId;
                } else {
                    showToast('Errore', resJSON.message, 'error');
                    takeButton.classList.remove('btn-loading');
                }
            } catch(e) {
                showToast('Errore', 'Impossibile prendere in carico il ticket.', 'error');
                takeButton.classList.remove('btn-loading');
            }
        } else if(openButton && ticketDiv) {
            const ticketId = ticketDiv.dataset.ticket_id;
            window.location.href = '/ticket/' + ticketId;
        }
    });
}

function renderTickets() {
    ticketsContainer.innerHTML = '';
    
    const trigger = document.createElement('p');
    trigger.className = 'spinner';
    trigger.id = 'infinite-scroll-trigger';
    ticketsContainer.appendChild(trigger);

    infiniteScroll = new InfiniteScroll(trigger, async (nextPage) => {
        try {
            const res = await fetch(`/api/tickets/feed?page=${nextPage}&status=${filter}&search=${search}`);
            const resJSON = await res.json();
            if (!resJSON.success) {
                showToast('Errore', resJSON.message, 'error');
                return false;
            }

            const tickets = resJSON.tickets;
            const fragment = document.createDocumentFragment();

            for (const ticket of tickets) {
                const e = document.createElement('article');
                e.classList.add('ticket');
                e.dataset.ticket_id = ticket.id;
                
                if(ticket.operator_id === userData.id) {
                    const mineBadge = document.createElement('div');
                    mineBadge.className = 'mine-badge';
                    mineBadge.innerHTML = '<i class="fa-solid fa-user-tag"></i>';
                    e.appendChild(mineBadge);
                }

                const ticketData = document.createElement('div');
                ticketData.classList.add('ticket-data');
                const idBadge = getIDBadge(ticket.id);
                ticketData.appendChild(idBadge);
                const priorityBadge = getPriorityBadge(ticket.priority, 'Priorità');
                ticketData.appendChild(priorityBadge);
                e.appendChild(ticketData);

                const ticketDescription = document.createElement('div');
                ticketDescription.className = 'ticket-description';
                const ticketTitle = document.createElement('h2');
                ticketTitle.className = 'ticket-title';
                ticketTitle.textContent = ticket.title;
                ticketDescription.appendChild(ticketTitle);

                const ticketInfo = document.createElement('p');
                ticketInfo.className = "small ticket-info";
                ticketInfo.textContent = ticket.category_names.join(' • ');
                ticketDescription.appendChild(ticketInfo);

                if(ticket.operator_id) {
                    const ticketAssigned = document.createElement('p');
                    ticketAssigned.className = "small ticket-info";
                    ticketAssigned.innerHTML = `Assegnato a: ${ticket.operator_first_name} ${ticket.operator_last_name}`;
                    ticketDescription.appendChild(ticketAssigned);
                }

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
                
                if(ticket.operator_id === null && ticket.status === 'pending') {
                    button.className = 'btn-md btn-primary btn-take';
                    button.innerHTML = '<i class="fa-solid fa-wrench btn-icon"></i>Prendi in carico';
                } else {
                    button.className = 'btn-md btn-secondary btn-open';
                    button.innerHTML = 'Apri <i class="fa-solid fa-arrow-right btn-icon"></i>';
                }
                
                ticketManage.appendChild(button);
                e.appendChild(ticketManage);

                fragment.append(e);
            }
            
            trigger.before(fragment);

            return (resJSON.tickets.length === 15);
        } catch (error) {
            showToast('Errore', "Impossibile caricare la lista dei ticket." + error, 'error');
            return false;
        }
    });
}
