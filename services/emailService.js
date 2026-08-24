const nodeMailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const transporter = nodeMailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Mappa per tradurre gli stati del DB in italiano
const statusTranslations = {
    'pending': 'In Attesa',
    'in_progress': 'In Lavorazione',
    'resolved': 'Risolto',
    'archived': 'Archiviato'
};

// Funzione helper per calcolare i colori del badge
function getStatusColors(status) {
    const statusLower = status.toLowerCase();

    // Colori di default (In Lavorazione)
    let bg = '#EBF0FF';
    let border = '#93AEFF';
    let text = '#1848CC';

    if (statusLower.includes('pending') || statusLower.includes('attesa')) {
        bg = '#FEF3C7';
        border = '#FBBF24';
        text = '#7C4F00';
    } else if (statusLower.includes('resolved') || statusLower.includes('risolto')) {
        bg = '#D6F5EB';
        border = '#6DDBB8';
        text = '#0D5E40';
    } else if (statusLower.includes('archived') || statusLower.includes('archiviato')) {
        bg = '#EEECEA';
        border = '#C2C0B8';
        text = '#3E3C38';
    }

    return { bg, border, text };
}

async function sendNewMessageNotification(targetEmail, userName, senderName, ticketId, ticketTitle, messageText, messageTime, ticketUrl) {
    try {
        const templatePath = path.join(__dirname, '../views/emails/new_message.ejs');

        const emailData = {
            userName: userName,
            senderName: senderName,
            ticketId: ticketId,
            ticketTitle: ticketTitle,
            messageText: messageText,
            messageTime: getFormattedDate(messageTime),
            ticketUrl: ticketUrl
        };

        const htmlContent = await ejs.renderFile(templatePath, emailData); // render template con dati effettivi

        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: targetEmail,
            subject: `[Ticket #${ticketId}] Hai un nuovo messaggio!`,
            html: htmlContent
        });

        console.log('Email inviata con successo a ' + targetEmail);
    } catch (error) {
        console.error('Errore invio email: \n' + error);
    }
}

async function sendStatusChangeNotification(targetEmail, userName, operatorName, ticketId, ticketTitle, oldStatus, newStatus, ticketUrl) {
    try {
        const templatePath = path.join(__dirname, '../views/emails/status_change.ejs');

        // Traduzione degli stati per l'interfaccia dell'email
        const oldStatusTranslated = statusTranslations[oldStatus.toLowerCase()] || oldStatus;
        const newStatusTranslated = statusTranslations[newStatus.toLowerCase()] || newStatus;

        // Calcolo dei colori per entrambi i badge
        const oldColors = getStatusColors(oldStatus);
        const newColors = getStatusColors(newStatus);

        const emailData = {
            userName: userName,
            operatorName: operatorName,
            ticketId: ticketId,
            ticketTitle: ticketTitle,
            oldStatus: oldStatusTranslated,
            newStatus: newStatusTranslated,
            ticketUrl: ticketUrl,
            oldStatusBg: oldColors.bg,
            oldStatusBorder: oldColors.border,
            oldStatusText: oldColors.text,
            newStatusBg: newColors.bg,
            newStatusBorder: newColors.border,
            newStatusText: newColors.text
        };

        const htmlContent = await ejs.renderFile(templatePath, emailData); // render template con dati effettivi

        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: targetEmail,
            subject: `[Ticket #${ticketId}] C'è un aggiornamento sul tuo ticket!`,
            html: htmlContent
        });

        console.log('Email inviata con successo a ' + targetEmail);
    } catch (error) {
        console.error('Errore invio email: \n' + error);
    }
}

function getFormattedDate(date) {
    const yyyy = date.getFullYear();
    const mm = date.getMonth() + 1;
    const dd = date.getDate();
    const hh = String(date.getHours()).padStart(2, '0');
    const ii = String(date.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy}, ${hh}:${ii}`;
}

module.exports = {
    sendNewMessageNotification,
    sendStatusChangeNotification
};