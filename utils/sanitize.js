function sanitizeHTML(html) {
    if (!html) return '';

    // Rimuove <script> e <style>
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Rimuove tutti i tag non ammessi
    return sanitized.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (match, tag) => {
        tag = tag.toLowerCase();
        if (['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div'].includes(tag)) {
            // Permette i tag ammessi rimuovendo tutti gli attributi
            return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
        }
        return '';
    });
}

module.exports = { sanitizeHTML };
