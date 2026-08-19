document.addEventListener('DOMContentLoaded', (event) => {

    document.body.addEventListener('submit', (event) => {
        const form = event.target;
        if (!form.hasAttribute('data-loading'))
            return;

        const submitBtn = form.querySelector('[type="submit"]');
        if (!submitBtn)
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
    if (!closeBtn)
        return;

    closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        closeModal();
    });


    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isModalOpened()) {
            closeModal();
        }
    })
}


function getStatusBadge(status, prefix = "") {
    const badge = document.createElement('p');
    badge.classList.add('status-badge');
    badge.classList.add(status.replace('_', '-'));

    let text;
    switch (status.toLowerCase()) {
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
    switch (priority.toLowerCase()) {
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
    if (!role)
        role = 'Client';

    let text;
    switch (role.toLowerCase()) {
        case "client":
            text = 'Cliente';
            badge.classList.add('client');
            break;
        case "operator":
            text = 'Operatore';
            badge.classList.add('operator');
            break;
        case "admin":
            text = 'Admin';
            badge.classList.add('admin');
            break;
        default:
            text = role;
            badge.classList.add('operator');
            break;
    }


    badge.innerHTML = '<i class="fa-solid fa-circle"></i>' + text;
    return badge;
}

function getIDBadge(id) {
    const badge = document.createElement('p');
    const size = id.toString().length;
    let text = '#';
    if (size >= 5)
        text += id;
    else {
        for (let i = 5; i > size; i--) {
            text += '0';
        }
        text += id;
    }

    badge.classList.add('id-badge');
    badge.textContent = text;
    return badge;
}

function getStatuses() {
    return Object.entries({
        pending: 'In Attesa',
        in_progress: 'In Lavorazione',
        resolved: 'Risolto',
        archived: 'Archiviato'
    });
}

function getPriorities() {
    return Object.entries({
        low: 'Bassa',
        medium: 'Media',
        high: 'Alta'
    });
}


function getCurrentDateFormatted() {
    const now = new Date();
    const weekday = now.toLocaleDateString('it-IT', { weekday: 'long' });
    const day = now.getDate();
    const month = now.toLocaleDateString('it-IT', { month: 'long' });
    const year = now.getFullYear();

    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

    return `${capitalizedWeekday}, ${day} ${month} ${year}`;
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
        return `Oggi, ${timeString}`;
    }

    // Controllo se è "Ieri"
    if (date >= yesterday && date < today) {
        return `Ieri, ${timeString}`;
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

    if (autoFocus) {
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

function getTextAreaElement(inputName, buttonId = null) {
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

    if (buttonId) {
        const button = document.createElement('button');
        button.id = buttonId;
        button.innerHTML = '<i class="fa-regular fa-paper-plane btn-icon"></i>Invia';
        button.className = 'textarea-send-button btn-sm btn-primary';
        toolbar.appendChild(button);
    }

    textArea.appendChild(toolbar);

    const editorContent = document.createElement('div');
    editorContent.classList.add("editor-content");
    editorContent.contentEditable = true;

    textArea.appendChild(editorContent);


    const hiddenInput = document.createElement('input');
    hiddenInput.hidden = true;
    hiddenInput.id = inputName;
    hiddenInput.name = inputName;
    hiddenInput.className = 'hidden-input';

    textArea.appendChild(hiddenInput);

    toolbar.addEventListener('mousedown', (event) => {
        const clicked = event.target.closest('.toolbar-button');
        if (!clicked)
            return;
        event.preventDefault();

        const command = clicked.dataset.cmd;
        document.execCommand(command, false, null);
        updateToolbarState();
    });

    editorContent.addEventListener('input', () => {
        hiddenInput.value = sanitizeHTML(editorContent.innerHTML);
    });

    editorContent.addEventListener('mouseup', updateToolbarState);
    editorContent.addEventListener('keyup', updateToolbarState);

    return textArea;
}

function resetTextArea(textAreaElement) {
    const textContent = textAreaElement.querySelector('.editor-content');
    textContent.innerHTML = '';

    const hiddenInput = textAreaElement.querySelector('.hidden-input');
    hiddenInput.value = '';
}

function syncHiddenInput(textArea, hiddenInput) {
    hiddenInput.value = sanitizeHTML(textArea.innerHTML);
}

function updateToolbarState() {
    const buttons = document.querySelectorAll('.toolbar-button');

    buttons.forEach((button) => {
        const command = button.dataset.cmd;
        const isActive = document.queryCommandState(command);
        if (isActive)
            button.classList.add('active');
        else
            button.classList.remove('active');
    })
}

function startLoading(element) {
    element.classList.add('btn-loading');
}
function stopLoading(element) {
    element.dispatchEvent(new CustomEvent('loading-end'));
    element.classList.remove('btn-loading');
}

function sanitizeHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Whitelist dei tag permessi (formattazione base e a capo)
    const allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV'];

    // Raccogliamo tutti gli elementi
    const elements = tempDiv.getElementsByTagName('*');
    const nodes = Array.from(elements);

    // Iteriamo al contrario per manipolare il DOM in sicurezza dal basso verso l'alto
    for (let i = nodes.length - 1; i >= 0; i--) {
        const el = nodes[i];

        if (!allowedTags.includes(el.nodeName.toUpperCase())) {
            // Tag non in whitelist: lo "scartiamo" estraendo il suo contenuto e mettendolo prima
            while (el.firstChild) {
                el.parentNode.insertBefore(el.firstChild, el);
            }
            el.parentNode.removeChild(el);
        } else {
            // Tag permesso: rimuoviamo TUTTI i suoi attributi per sicurezza assoluta (no onclick, no href, no style)
            while (el.attributes.length > 0) {
                el.removeAttribute(el.attributes[0].name);
            }
        }
    }

    return tempDiv.innerHTML;
}