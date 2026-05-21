
/**
 * Recupera gli ID e Nomi delle categorie associate ad un ruolo
 * @param {Object} connection
 * @param {string} roleName
 * @returns {Promise<Array<{category_id: number, category_name: string}>>}
 */
async function getCategoryIdsByRole(connection, roleName) {
    if(!roleName || roleName === 'Client')
        return [];

    // Se è Admin, estraggo direttamente tutto dalla tabella categories
    if (roleName.toLowerCase() === 'admin') {
        const [allCategories] = await connection.query('SELECT id AS category_id, name AS category_name FROM categories');
        return allCategories.map(row => ({ category_id: row.category_id, category_name: row.category_name }));
    }

    const query = `
        SELECT rc.category_id, c.name AS category_name
        FROM role_categories rc
        JOIN roles r on r.id = rc.role_id
        JOIN categories c ON c.id = rc.category_id
        WHERE r.name = ?
    `;

    const [result] = await connection.query(query, queryParams);
    return result.map(row => ({category_id: row.category_id, category_name: row.category_name}));
}

module.exports = {
    getCategoryIdsByRole
};