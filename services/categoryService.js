const db = require('../db/connection');

let categoryCache = {};

async function loadCategories() {
    const connection = await db.getConnection();
    try {
        const [categories] = await connection.query('SELECT id, name, parent_id FROM categories WHERE is_active = TRUE');

        const rawMap = {};
        for(const cat of categories) {
            rawMap[cat.id] = { ...cat };
        }

        const newCache = {};

        for(const cat of categories) {
            const idPath = [];
            const namePath = [];
            let current = rawMap[cat.id];

            // Risale albero fino alla radice
            while(current) {
                idPath.unshift(current.id);
                namePath.unshift(current.name);
                current = rawMap[current.parent_id];
            }

            newCache[cat.id] = {
                idPath,
                namePath
            };
        }

        categoryCache = newCache;
    } catch(error) {
        console.error("Errore caricamento cache categorie: " + error);
    } finally {
        connection.release();
    }
}

function getCategoryPaths(categoryId) {
    const cached = categoryCache[categoryId];
    if(!cached)
        return { category_ids: [], category_names: [] };

    return {
        category_ids: cached.idPath,
        category_names: cached.namePath
    };
}

module.exports = {
    loadCategories,
    getCategoryPaths
};