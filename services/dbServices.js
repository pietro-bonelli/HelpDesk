
/**
 * Recupera gli ID e Nomi delle categorie associate ad un ruolo
 * @param {Object} connection
 * @param {string} roleName
 * @param {boolean} isAdmin
 * @returns {Promise<Array<{category_id: number, category_name: string}>>}
 */
async function getCategoryIdsByRole(connection, roleName, isAdmin) {
    if(!roleName || roleName === 'Client')
        return [];

    if (isAdmin) {
        const [allCategories] = await connection.query('SELECT id AS category_id, name AS category_name FROM categories');
        return allCategories.map(row => ({ category_id: row.category_id, category_name: row.category_name }));
    }

    const assignedQuery = `
        SELECT rc.category_id
        FROM role_categories rc
        JOIN roles r on r.id = rc.role_id
        WHERE r.name = ?
    `;
    const [assignedRows] = await connection.query(assignedQuery, [roleName]);
    // Estrae ID di partenza
    const startIds = assignedRows.map(row => row.category_id);
    if(startIds.length === 0)
        return [];

    const [allCats] = await connection.query('SELECT id, name, parent_id FROM categories');
    const resultSet = new Set(); // per evitare duplicati

    // Funzione ricorsiva per trovare tutte le sotto-categorie
    function findChildren(parentID) {
        resultSet.add(parentID);
        const children = allCats.filter(cat => cat.parent_id === parentID);
        
        // Ricorsione per trovare tutte le eventuali sotto-categorie
        for(const child of children)
            findChildren(child.id);
    }

    // Ricorsione per tutte le categorie iniziali assegnate
    for(const id of startIds)
        findChildren(id);

    return allCats
        .filter(cat => resultSet.has(cat.id))
        .map(cat => ({
            category_id: cat.id,
            category_name: cat.name
        }));
}

module.exports = {
    getCategoryIdsByRole
};