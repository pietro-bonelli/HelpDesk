
document.addEventListener('DOMContentLoaded', (event) => {

    document.body.addEventListener('submit', (event) => {
        const form = event.target;
        if(!form.hasAttribute('data-loading'))
            return;

        const submitBtn = form.querySelector('[type="submit"]');
        if(!submitBtn)
            return;

        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loadning');


        // In ascolto per fine caricamento
        form.addEventListener('loading-end', () => {
            submitBtn.disabled = false;
            submitBtn.classList.remove('btn-loading');
        }, { once: true }); //rimuove il listener dopo il primo trigger
    })
});


function getStatusBadge(status, prefix = "") {
    const badge = document.createElement('p');
    badge.classList.add('status-badge');
    badge.classList.add(status.replace('_', '-'));

    let text;
    switch(status.toLowerCase()) {
        case "pending":
            text = 'In Attesa';
            break;
        case "in_progress":
            text = "In Lavorazione";
            break;
        case "resolved":
            text = "Risolto";
            break;
        case "archived":
            text = "Archiviato";
            break;
    }

    badge.innerHTML = `<i class="fa-solid fa-circle"></i>${prefix} ${text}`;

    return badge;
}

function getPriorityBadge(priority, prefix = "") {
    const badge = document.createElement('p');
    badge.classList.add('priority-badge');
    badge.classList.add(priority);

    let text;
    switch(priority.toLowerCase()) {
        case "low":
            text = 'Bassa';
            break;
        case "medium":
            text = "Media";
            break;
        case "high":
            text = "Alta";
            break;
    }

    badge.innerHTML = `<i class="fa-solid fa-circle"></i>${prefix} ${text}`;

    return badge;
}

function getUserBadge(role) {
    const badge = document.createElement('p');
    
    badge.classList.add('role-badge');
    badge.classList.add(role);

    let text;
    switch(role.toLowerCase()) {
        case "client":
            text = 'Cliente';
            break;
        case "operator":
            text = 'Operatore';
            break;
        case "admin":
            text = 'Admin';
            break;
    }

    
    badge.innerHTML = '<i class="fa-solid fa-circle">' + text + '</i>';
    return badge;
}

function getIDBadge(id) {
    const badge = document.createElement('p');
    const size = id.toString().length;
    let text = '#';
    if(size >= 5)
        text += id;
    else {
        for(let i = 5; i > size; i--) {
            text += '0';
        }
        text += id;
    }
    
    badge.classList.add('id-badge');
    badge.textContent = text;
    return badge;
}


const formatRelativeDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    
    // Fallback nel caso in cui la stringa passata non sia una data valida
    if (isNaN(date.getTime())) return dateString;

    // Data di oggi a mezzanotte esatta
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Data di ieri a mezzanotte esatta
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Padding per assicurarsi di avere due cifre per ore e minuti (es. 09:05 invece di 9:5)
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    // Controllo se è "Oggi"
    if (date >= today) {
        return `Oggi ${timeString}`;
    }

    // Controllo se è "Ieri"
    if (date >= yesterday && date < today) {
        return `Ieri ${timeString}`;
    }

    // Altrimenti formato standard: dd/mm/yyyy hh:ii
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // In JS i mesi partono da 0
    const year = date.getFullYear();

    return `${day}/${month}/${year} ${timeString}`;
};