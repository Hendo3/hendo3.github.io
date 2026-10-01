export function validateState(data) {
    if (!data || !Array.isArray(data.links) || !Array.isArray(data.sectors)
        || !data.aliases || typeof data.aliases !== "object" || Array.isArray(data.aliases)) {
        throw new Error("Invalid data format.");
    }
    if (data.sectors.length > 50 || data.links.length > 1000 || Object.keys(data.aliases).length > 100) {
        throw new Error("Limit: 50 sectors, 1000 links and 100 aliases.");
    }
    const sectors = new Set();
    for (const sector of data.sectors) {
        if (!sector || !/^[a-z][a-z0-9_-]{0,39}$/.test(sector.id) || sectors.has(sector.id)
            || typeof sector.label !== "string" || !sector.label.trim() || sector.label.length > 80) {
			throw new Error("Invalid sector or duplicate ID.");
			
        }
        sectors.add(sector.id);
    }
    const ids = new Set();
    for (const link of data.links) {
        if (!link || typeof link.id !== "string" || !link.id || ids.has(link.id)
            || !sectors.has(link.sector) || typeof link.label !== "string" || !link.label.trim()
            || link.label.length > 160 || typeof link.url !== "string" || link.url.length > 4096) {
            throw new Error("Invalid link, duplicate ID or missing sector.");
        }
        const url = new URL(link.url, "https://homepage.invalid/");
        if (!/^https?:$/.test(url.protocol) || /\s/.test(link.url)
            || !( /^https?:\/\//i.test(link.url) || /^\/(?!\/)/.test(link.url) )) {
            throw new Error("Invalid URL.");
        }
        ids.add(link.id);
    }
    for (const [name, value] of Object.entries(data.aliases)) {
        if (!/^\w{1,40}$/.test(name) || ["__proto__", "constructor", "prototype"].includes(name)
            || typeof value !== "string" || !value.trim() || value.length > 1000) {
            throw new Error("Invalid alias.");
        }
    }
    return data;
}
