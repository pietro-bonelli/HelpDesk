let ticketId;
let ticketData;
let userData;

let privateNotes;
let ticketMessages;

let lastMessageId = 0;
let lastPrivateNoteId = 0;

let chatMessagesContainer;
let privateNotesContentContainer;

const messageAudio = new Audio('/sounds/chat_message.mp3');

document.addEventListener("DOMContentLoaded", async () => {
    ticketId = window.location.pathname.split("/").pop();

    chatMessagesContainer = document.getElementById('chat-messages');
    privateNotesContentContainer = document.getElementById('private-notes-content');

    await loadTicketData();
    await loadUserData();

    loadTicketInformation();
    loadActionButtons();
    loadChatMessages();
    loadPrivateNotes();

    startPolling();

    loadSendRatingListener();
    loadRatingBox();
    loadResponsive();
});

async function loadTicketInformation() {
    const archiveButton = document.getElementById('archive-ticket-btn');
    const closeButton = document.getElementById('close-ticket-btn');

    archiveButton.classList.add('hidden');
    closeButton.classList.add('hidden');

    if (ticketData.status === 'resolved' && ticketData.status !== 'archived')
        archiveButton.classList.remove('hidden');
    if (ticketData.status !== 'resolved' && ticketData.status !== 'archived')
        closeButton.classList.remove('hidden');

    const aside = document.getElementById('aside');
    if (userData.role_id) {
        aside.classList.add('aside-operator');
        const backBtn = document.getElementById('back-ticket-btn');
        if (backBtn) backBtn.href = '/operator';
    }

    const title = document.getElementById('ticket-title');
    title.textContent = ticketData.title;

    const badgeSection = document.getElementById('badge-section');
    badgeSection.innerHTML = '';
    badgeSection.appendChild(getIDBadge(ticketId));
    badgeSection.appendChild(getPriorityBadge(ticketData.priority, 'Priorità'));
    badgeSection.appendChild(getStatusBadge(ticketData.status));

    const prioritySelect = document.getElementById('priority');
    if (ticketData.status === 'archived' || ticketData.status === 'resolved')
        prioritySelect.disabled = true;
    else
        prioritySelect.disabled = false;
    prioritySelect.innerHTML = '';
    for (const [key, value] of getPriorities()) {
        const opt = document.createElement('option');
        opt.value = key;
        if (ticketData.priority === key)
            opt.selected = true;
        opt.textContent = value;
        prioritySelect.appendChild(opt);
    }

    const statusSelect = document.getElementById('status');
    statusSelect.innerHTML = '';
    for (const [key, value] of getStatuses()) {
        const opt = document.createElement('option');
        opt.value = key;
        if (ticketData.status === key)
            opt.selected = true;
        opt.textContent = value;
        statusSelect.appendChild(opt);
    }

    const createdAt = document.getElementById('created-at');
    createdAt.textContent = formatRelativeDate(ticketData.created_at);
    const updatedAt = document.getElementById('updated-at');
    updatedAt.textContent = formatRelativeDate(ticketData.updated_at);
    const ticketIdElement = document.getElementById('ticket-id');
    ticketIdElement.innerHTML = '';
    ticketIdElement.appendChild(getIDBadge(ticketId));
    const operator = document.getElementById('operator');
    operator.textContent = ticketData.operator_first_name ? ticketData.operator_first_name + ' ' + ticketData.operator_last_name : 'N/A';
    const client = document.getElementById('client');
    client.textContent = ticketData.client_first_name + ' ' + ticketData.client_last_name;
    const categoryElement = document.getElementById('category');
    categoryElement.textContent = ticketData.category_names.join(' • ');
}

function loadActionButtons() {
    const ticketActions = document.getElementById('ticket-actions');
    ticketActions.addEventListener('click', async (event) => {
        const clicked = event.target.closest('button');
        if (!clicked)
            return;
        event.preventDefault();

        const statusElement = document.getElementById('status');
        let payload = {};
        switch (clicked.id) {
            case 'edit-ticket-btn':
                const titleElement = document.getElementById('ticket-title');
                const priorityElement = document.getElementById('priority');

                if (titleElement.textContent === ticketData.title &&
                    priorityElement.value === ticketData.priority &&
                    statusElement.value === ticketData.status) {
                    showToast('Info', 'Nessuna informazione è stata modificata.', 'info');
                    return;
                }

                payload = {
                    title: titleElement.textContent,
                    priority: priorityElement.value,
                    status: statusElement.value
                };
                clicked.classList.add('btn-loading');
                sendData();
                break;
            case 'archive-ticket-btn':
                setModalTitle('Conferma archiviazione Ticket');
                const archDesc = document.createElement('p');
                archDesc.textContent = 'Sei sicuro di voler archiviare questo ticket?';
                addModalElement(archDesc);
                const archButton = document.createElement('button');
                archButton.className = 'btn-md btn-primary';
                archButton.innerHTML = '<i class="fa-solid fa-box-archive btn-icon"></i>Archivia';
                addModalFooter(archButton);
                openModal(false);

                archButton.addEventListener('click', async () => {
                    payload = {
                        status: 'archived'
                    };
                    archButton.classList.add('btn-loading');
                    sendData();
                });
                break;
            case 'close-ticket-btn':
                setModalTitle('Conferma chiusura Ticket');
                const closeDesc = document.createElement('p');
                closeDesc.textContent = 'Sei sicuro di voler chiudere questo ticket?';
                addModalElement(closeDesc);
                const closeButton = document.createElement('button');
                closeButton.className = 'btn-md btn-danger';
                closeButton.innerHTML = '<i class="fa-solid fa-lock btn-icon"></i>Chiudi';
                addModalFooter(closeButton);
                openModal(false);

                closeButton.addEventListener('click', () => {
                    payload = {
                        status: 'resolved'
                    };
                    closeButton.classList.add('btn-loading');
                    sendData();
                });
        }

        async function sendData() {
            const res = await fetch('/api/tickets/' + ticketId, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const resJSON = await res.json();
            if (resJSON.success)
                showToast('Successo', resJSON.message, 'success');
            else
                showToast('Errore', resJSON.message, 'error');

            closeModal();

            await loadTicketData();
            loadTicketInformation();
            clicked.classList.remove('btn-loading');
        }
    });
}

async function loadPrivateNotes() {
    const privateNotesContainer = document.getElementById('private-notes');
    if (userData.role_id === null)
        return;

    privateNotesContainer.classList.remove('hidden');

    const privateNotesHeader = document.getElementById('private-notes-header');
    privateNotesHeader.addEventListener('click', () => {
        privateNotesContainer.classList.toggle('expanded');
    });

    const richTextArea = getTextAreaElement('private-note-message', 'send-private-note');
    richTextArea.id = 'private-notes-textarea';
    richTextArea.style.height = "100%";
    document.getElementById('private-notes-textarea-wrapper').appendChild(richTextArea);

    const sendPrivateNoteButton = document.getElementById('send-private-note');
    sendPrivateNoteButton.addEventListener('click', async () => {
        const input = document.querySelector('input[name="private-note-message"]');
        if (!input)
            return;

        sendPrivateNoteButton.classList.add('btn-loading');
        await sendMessage(input.value, 'private');
        resetTextArea(richTextArea);
        sendPrivateNoteButton.classList.remove('btn-loading');
    });

    await fetchPrivateNotes();

    // caricamento scroll in ritardo per evitare che si triggeri subito
    setTimeout(() => {
        const trigger = document.getElementById('load-more-notes');
        new InfiniteScroll(trigger, async (page) => {
            const limit = 10;
            const offset = page * limit;
            return await fetchPrivateNotes(limit, offset, true);
        }, {
            root: privateNotesContentContainer
        });
    }, 500);
}

async function fetchPrivateNotes(limit = 10, offset = 0, appendTop = false, minId = 0) {
    try {
        const res = await fetch(`/api/messages/ticket/${ticketId}/private?limit=${limit}&offset=${offset}`);
        const resJSON = await res.json();

        if (!resJSON.success) {
            showToast('Errore', resJSON.message, 'error');
            return;
        }

        let messages = resJSON.messages;

        let oldScrollHeight = 0;
        let spinner = null;

        if (appendTop) {
            spinner = document.getElementById('load-more-notes');
            oldScrollHeight = privateNotesContentContainer.scrollHeight;
            messages.reverse();
        }


        for (const message of messages) {
            appendPrivateNote(privateNotesContentContainer, message.id, message.message_text, `${message.first_name} ${message.last_name}`, formatRelativeDate(message.created_at), spinner);
        }

        if (appendTop) {
            privateNotesContentContainer.scrollTop = privateNotesContentContainer.scrollHeight - oldScrollHeight; // riporta lo scroll alla posizione corretta.
        } else { // primo caricamento, scrolla infondo alla lista messaggi
            await new Promise(resolve => setTimeout(resolve, 15));
            privateNotesContentContainer.scrollTop = privateNotesContentContainer.scrollHeight;
        }

        return messages.length > 0; // true se ci sono ancora messaggi
    } catch (error) {
        showToast('Errore', 'Si è verificato un problema durante il caricamento delle note private.', 'error');
    }
}

function appendPrivateNote(container, id, text, author, date, appendAfter = null, scrollDown = false) {
    if (!appendAfter)
        lastPrivateNoteId = id;
    const note = document.createElement('div');
    note.className = 'note';
    if (appendAfter === null)
        container.appendChild(note);
    else {
        appendAfter.after(note);
    }

    const noteMessage = document.createElement('p');
    noteMessage.className = 'note-message';
    noteMessage.innerHTML = text;
    note.appendChild(noteMessage);

    const noteInfo = document.createElement('p');
    noteInfo.className = 'note-info small';
    noteInfo.textContent = `${author} • ${date}`;
    note.appendChild(noteInfo);

    if (scrollDown) {
        container.scrollTop = container.scrollHeight;
    }
}

// Chat

async function loadChatMessages() {
    const richTextArea = getTextAreaElement('chat-message', 'send-message');
    richTextArea.id = 'chat-textarea';
    richTextArea.style.height = "100%";
    if (ticketData.status === 'archived' || ticketData.status === 'resolved')
        richTextArea.classList.add('hidden');
    document.getElementById('chat-textarea-container').appendChild(richTextArea);

    const sendMessageButton = document.getElementById('send-message');
    sendMessageButton.addEventListener('click', async () => {
        const input = document.querySelector('input[name="chat-message"]');
        if (!input)
            return;

        sendMessageButton.classList.add('btn-loading');
        await sendMessage(input.value, 'default');
        resetTextArea(richTextArea);
        sendMessageButton.classList.remove('btn-loading');
    });

    await fetchChatMessages();

    // caricamento scroll in ritardo per evitare che si triggeri subito
    setTimeout(() => {
        const trigger = document.getElementById('load-more-messages');
        new InfiniteScroll(trigger, async (page) => {
            const limit = 10;
            const offset = page * limit;
            return await fetchChatMessages(limit, offset, true);
        }, {
            root: chatMessagesContainer
        });
    }, 500);
}

async function fetchChatMessages(limit = 10, offset = 0, appendTop = false, minId = 0) {
    try {
        const res = await fetch(`/api/messages/ticket/${ticketId}?limit=${limit}&offset=${offset}`);
        const resJSON = await res.json();

        if (!resJSON.success) {
            showToast('Errore', resJSON.message, 'error');
            return;
        }

        let messages = resJSON.messages;

        let oldScrollHeight = 0;
        let spinner = null;

        if (appendTop) {
            spinner = document.getElementById('load-more-messages');
            oldScrollHeight = chatMessagesContainer.scrollHeight;
            messages.reverse();
        }


        for (const message of messages) {
            appendMessage(chatMessagesContainer, message.id, message.message_text, `${message.first_name} ${message.last_name}`, message.sender_id, message.role_id, formatRelativeDate(message.created_at), spinner);
        }

        if (appendTop) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight - oldScrollHeight; // riporta lo scroll alla posizione corretta.
        } else { // primo caricamento, scrolla infondo alla lista messaggi
            await new Promise(resolve => setTimeout(resolve, 15));
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }

        return messages.length > 0; // true se ci sono ancora messaggi
    } catch (error) {
        console.error(error);
        showToast('Errore', 'Si è verificato un problema durante il caricamento dei messaggi.', 'error');
    }
}

function appendMessage(container, id, text, authorName, authorId, authorRole, date, appendAfter = null, scrollDown = false) {
    if (!appendAfter)
        lastMessageId = id;
    const message = document.createElement('div');
    message.className = 'message';
    if (authorId === userData.id)
        message.classList.add('right');
    else
        message.classList.add('left');

    if (authorRole === null)
        message.classList.add('client');
    else
        message.classList.add('operator');

    if (appendAfter === null)
        container.appendChild(message);
    else {
        appendAfter.after(message);
    }

    const messageText = document.createElement('p');
    messageText.className = 'message-text';
    messageText.innerHTML = text;
    message.appendChild(messageText);

    const messageData = document.createElement('div');
    messageData.className = 'message-data';
    message.appendChild(messageData);

    const messageOwner = document.createElement('p');
    messageOwner.className = 'message-owner';
    messageOwner.textContent = authorName;
    messageData.appendChild(messageOwner);

    const messageDate = document.createElement('p');
    messageDate.className = 'message-date';
    messageDate.textContent = date;
    messageData.appendChild(messageDate);

    if (scrollDown) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage(messageText, messageType) {
    if (messageType === 'private' && userData.role_name === 'Client') {
        showToast('Errore', 'Non sei autorizzato ad inviare note private.', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/messages/ticket/${ticketId}`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                message_text: messageText,
                message_type: messageType
            })
        });
        const resJSON = await res.json();

        if (resJSON.success) {
            showToast('Successo', resJSON.message, 'success');

            if (messageType === 'private') {
                appendPrivateNote(privateNotesContentContainer, resJSON.message_id, messageText, `${userData.first_name} ${userData.last_name}`, formatRelativeDate(Date.now()), null, true);
            } else if (messageType === 'default') {
                appendMessage(chatMessagesContainer, resJSON.message_id, messageText, `${userData.first_name} ${userData.last_name}`, userData.id, userData.role_id, formatRelativeDate(Date.now()), null, true);
            }
        }
        else
            showToast('Errore', resJSON.message, 'error');
    } catch (error) {
        showToast('Errore', 'Si è verificato un problema durante l\'invio del messaggio.', 'error');
    }
}


async function loadTicketData() {
    const res = await fetch(`/api/tickets/${ticketId}`);
    const resJSON = await res.json();

    if (!resJSON.success) {
        if (resJSON.message === 'Accesso negato: non sei autorizzato a visualizzare questo ticket.' || resJSON.message === 'Ticket non trovato.')
            window.location.href = '/dashboard';
        showToast('Errore', resJSON.message, 'error');
    } else {
        ticketData = resJSON.ticket;
    }
}

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

function startPolling() {
    let isPolling = false;
    setInterval(async () => {
        if (isPolling)
            return;
        isPolling = true;

        try {
            const resData = await fetch(`/api/tickets/${ticketId}`);
            const resDataJSON = await resData.json();
            if (!resDataJSON.success) {
                showToast('Errore', resDataJSON.message, 'error');
                return;
            }

            ticketData = resDataJSON.ticket;
            loadTicketInformation();
            loadRatingBox();

            const chatTextArea = document.getElementById('chat-textarea');
            if (ticketData.status === 'resolved' || ticketData.status === 'archived') {
                chatTextArea.classList.add('hidden');
            } else {
                chatTextArea.classList.remove('hidden');
            }

            // Polling messaggi chat pubblica
            if (lastMessageId > 0) {
                const res = await fetch(`/api/messages/ticket/${ticketId}?min_id=${lastMessageId + 1}`);
                const resJSON = await res.json();

                if (!resJSON.success) {
                    showToast('Errore', resJSON.message, 'error');
                    return;
                } else if (resJSON.messages && resJSON.messages.length > 0) {
                    for (const message of resJSON.messages) {
                        appendMessage(chatMessagesContainer, message.id, message.message_text, `${message.first_name} ${message.last_name}`, message.sender_id, message.role_id, formatRelativeDate(message.created_at), null, true);
                    }
                    try {
                        messageAudio.play();
                    } catch (e) {
                    }
                }
            }

            // Polling note private (solo se admin)
            if (userData.role_id !== null && lastPrivateNoteId > 0) {
                const resNotes = await fetch(`/api/messages/ticket/${ticketId}/private?min_id=${lastPrivateNoteId + 1}`);
                const resNotesJSON = await resNotes.json();

                if (!resNotesJSON.success) {
                    showToast('Errore', resNotesJSON.message, 'error');
                } else if (resNotesJSON.messages && resNotesJSON.messages.length > 0) {
                    for (const note of resNotesJSON.messages) {
                        appendPrivateNote(privateNotesContentContainer, note.id, note.message_text, `${note.first_name} ${note.last_name}`, formatRelativeDate(note.created_at), null, true);
                    }
                }
            }
        } catch (error) {
            console.error("Errore durante il polling:", error);
        }

        isPolling = false;
    }, 5000);
}

function loadRatingBox() {
    const ratingForm = document.getElementById('rating-form');
    const isClient = !userData.role_id;
    const hasRated = !!ticketData.rating_stars;

    if (ticketData.status === 'resolved') {
        ratingForm.classList.remove('hidden');
        
        if (!isClient) {
            const titleLabel = ratingForm.querySelector('.label-upper');
            if (titleLabel) titleLabel.textContent = "Valutazione dell'utente";
        }

        if (hasRated) {
            ratingForm.classList.add('disabled-form');
            const selectedStar = document.getElementById(`${ticketData.rating_stars}-stars`);
            selectedStar.checked = true;
            const commentTextarea = ratingForm.querySelector('#comment');
            commentTextarea.textContent = ticketData.rating_comment;
            commentTextarea.disabled = true;

            const button = ratingForm.querySelector('button');
            button.textContent = isClient ? 'Valutazione già inviata' : 'Valutazione utente';
            Array.from(ratingForm.elements).forEach(el => el.disabled = true);
        } else if (!isClient) {
            ratingForm.classList.add('disabled-form');
            const button = ratingForm.querySelector('button');
            button.textContent = 'Nessuna valutazione lasciata';
            Array.from(ratingForm.elements).forEach(el => el.disabled = true);
        }
    } else {
        ratingForm.classList.add('hidden');
    }
}

function loadSendRatingListener() {
    const form = document.getElementById('rating-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const button = event.target.querySelector('button');
        startLoading(button);

        const formData = new FormData(form);
        const starsValue = formData.get('stars');
        const commentValue = formData.get('comment');

        try {
            const res = await fetch(`/api/tickets/${ticketId}/rating`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accepts': 'application/json'
                },
                body: JSON.stringify({
                    stars: starsValue,
                    comment: commentValue
                })
            });

            const resJSON = await res.json();
            if (!resJSON.success) {
                showToast('Errore', resJSON.message, 'error');
            } else {
                showToast('Successo', resJSON.message, 'success');
                await loadTicketData();
                loadRatingBox();
            }
        } catch (error) {
            showToast('Errore', 'Non è stato possibile inviare la valutazione.', 'error');
        } finally {
            stopLoading(button);
        }
    });
}

function loadResponsive() {
    const showAsideButton = document.getElementById('show-info');
    const main = document.querySelector('main');
    if (window.screen.width <= 700) {
        const privateNotes = document.getElementById('private-notes');
        privateNotes.classList.remove('expanded');
    }

    showAsideButton.addEventListener('click', () => {
        main.classList.toggle('aside-opened');
    })
}