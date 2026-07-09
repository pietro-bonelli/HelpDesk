
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
    });

    loadModalListeners();
});

function loadModalListeners() {
    const closeBtn = document.getElementById('modal-close-btn');
    
    closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        closeModal();
    });


    document.addEventListener('keydown', (event) => {
        if(event.key === 'Escape' && isModalOpened()) {
            closeModal();
        }
    })
}


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


/*
    MODALI
*/

function setModalTitle(title) {
    const modalTitle = document.getElementById('modal-title');

    modalTitle.textContent = title;
}

function addModalElement(element) {
    const modalBody = document.getElementById('modal-body');

    modalBody.appendChild(element);
}

function addModalFooter(element) {
    const modalFooter = document.getElementById('modal-footer');

    modalFooter.appendChild(element);
}

function openModal(autoFocus = true) {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.classList.remove('hidden');
    void modalOverlay.offsetWidth; // Forza un "refresh"
    modalOverlay.classList.add('show');
    document.body.classList.add('modal-open');

    document.querySelector('header').setAttribute('inert', '');
    document.querySelector('main').setAttribute('inert', '');
    document.querySelector('footer').setAttribute('inert', '');

    if(autoFocus) {
        const elements = modalOverlay.querySelectorAll('input, textarea, select');
        elements[0].focus();
    }
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.classList.remove('show');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
        resetModal();
    }, 300);

    document.body.classList.remove('modal-open');

    document.querySelector('header').removeAttribute('inert');
    document.querySelector('main').removeAttribute('inert');
    document.querySelector('footer').removeAttribute('inert');
}

function resetModal() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.innerHTML = '';
    modalBody.innerHTML = '';
    modalFooter.innerHTML = '';
}

function isModalOpened() {
    return document.body.classList.contains('modal-open');
}

function getTextAreaElement() {
    const textArea = document.createElement('div');
    textArea.classList.add('rich-text-editor');

    const toolbar = document.createElement('div');
    toolbar.classList.add('editor-toolbar');

    const bold = document.createElement('button');
    bold.className = 'toolbar-button';
    bold.dataset.cmd = 'bold';
    bold.title = 'Grassetto (Ctrl + B)';
    bold.innerHTML = '<i class="fa-solid fa-bold"></i>';
    bold.type = 'button';

    const italic = document.createElement('button');
    italic.className = 'toolbar-button';
    italic.dataset.cmd = 'italic';
    italic.title = 'Corsivo (Ctrl + I)';
    italic.innerHTML = '<i class="fa-solid fa-italic"></i>';
    italic.type = 'button';

    const underlined = document.createElement('button');
    underlined.className = 'toolbar-button';
    underlined.dataset.cmd = 'underline';
    underlined.title = 'Grassetto (Ctrl + B)';
    underlined.innerHTML = '<i class="fa-solid fa-underline"></i>';
    underlined.type = 'button';
    
    toolbar.appendChild(bold);
    toolbar.appendChild(italic);
    toolbar.appendChild(underlined);

    textArea.appendChild(toolbar);

    const editorContent = document.createElement('div');
    editorContent.classList.add("editor-content");
    editorContent.contentEditable = true;
    editorContent.placeholder = "Descrivi il problema...";

    textArea.appendChild(editorContent);


    const hiddenInput = document.createElement('input');
    hiddenInput.hidden = true;
    hiddenInput.id = 'ticket-message';
    hiddenInput.name = 'ticket-message';

    textArea.appendChild(hiddenInput);

    toolbar.addEventListener('mousedown', (event) => {
        const clicked = event.target.closest('.toolbar-button');
        if(!clicked)
            return;
        event.preventDefault();

        const command = clicked.dataset.cmd;
        document.execCommand(command, false, null);
        updateToolbarState();
    });

    editorContent.addEventListener('input', () => {
        hiddenInput.value = editorContent.innerHTML;
    });

    editorContent.addEventListener('mouseup', updateToolbarState);
    editorContent.addEventListener('keyup', updateToolbarState);

    return textArea;
}

function syncHiddenInput(textArea, hiddenInput) {
    hiddenInput.value = textArea.innerHTML;
}

function updateToolbarState() {
    const buttons = document.querySelectorAll('.toolbar-button');

    buttons.forEach((button) => {
        const command = button.dataset.cmd;
        const isActive = document.queryCommandState(command);
        if(isActive)
            button.classList.add('active');
        else
            button.classList.remove('active');
    }) 
}