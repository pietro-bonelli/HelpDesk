const activeUsers = new Map();

const THRESHOLD = 10; // threshold di 10 secondi prima di comparire come offline (polling fatto ogni 5)

function updateLastSeen(userId) {
    activeUsers.set(userId, Date.now());
}

function isOnline(userId) {
    const lastSeen = activeUsers.get(userId);

    if (!lastSeen)
        return false;

    if ((Date.now() - lastSeen) < (THRESHOLD * 1000))
        return true;

    return false;
}

module.exports = {
    updateLastSeen,
    isOnline
}