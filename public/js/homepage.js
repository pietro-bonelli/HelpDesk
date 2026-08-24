let totalUsers;
let resolvedTickets;
let rating;

document.addEventListener('DOMContentLoaded', () => {
    totalUsers = document.getElementById('total-users');
    resolvedTickets = document.getElementById('resolved-tickets');
    rating = document.getElementById('rating');

    loadStatistics();
    faqHandler();
});

async function loadStatistics() {
    try {
        const stats = await fetch('/api/stats/public');
        const statsJSON = await stats.json();

        if (!statsJSON.success)
            return;
        totalUsers.textContent = statsJSON.data.total_users;
        resolvedTickets.textContent = statsJSON.data.resolved_tickets;
        rating.style.width = `${(statsJSON.data.average_rating / 5) * 100}%`;
    } catch (error) {
        console.error(error);
        showToast('Errore', 'Impossibile recuperare le statistiche.', 'error');
    }
}

function faqHandler() {
    const faqWrapper = document.getElementById('faq-wrapper');
    faqWrapper.addEventListener('click', (event) => {
        const clicked = event.target.closest('.faq-title');
        if (!clicked) return;
        const currentItem = clicked.closest('.faq-box');
        currentItem.classList.toggle('collapsed');
    });
}