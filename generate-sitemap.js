const fs = require('fs');

const BASE_URL = "https://freeearningsonline.github.io";
const FIREBASE_DB_URL = "https://aiprom-98a50-default-rtdb.firebaseio.com/prompts.json";

async function generateSitemap() {
    try {
        console.log("Fetching prompts from Firebase...");
        const response = await fetch(FIREBASE_DB_URL);
        const data = await response.json();

        let urls = [
            `${BASE_URL}/`,
            `${BASE_URL}/index.html`,
            `${BASE_URL}/about.html`,
            `${BASE_URL}/contact.html`,
            `${BASE_URL}/privacy-policy.html`,
            `${BASE_URL}/terms.html`,
            `${BASE_URL}/disclaimer.html`,
            `${BASE_URL}/editorial-policy.html`,
            `${BASE_URL}/how-it-works.html`,
            `${BASE_URL}/ai-prompt-guide.html`,
            `${BASE_URL}/authors.html`
        ];

        if (data) {
            Object.keys(data).forEach(id => {
                urls.push(`${BASE_URL}/prompt.html?id=${id}`);
            });
        }

        const currentDate = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        urls.forEach(url => {
            xml += `  <url>\n`;
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <lastmod>${currentDate}</lastmod>\n`;
            xml += `    <changefreq>daily</changefreq>\n`;
            xml += `    <priority>${url.includes('prompt.html') ? '0.8' : '1.0'}</priority>\n`;
            xml += `  </url>\n`;
        });

        xml += `</urlset>`;

        fs.writeFileSync('sitemap.xml', xml);
        console.log("sitemap.xml updated successfully with " + urls.length + " URLs!");

    } catch (error) {
        console.error("Error generating sitemap:", error);
    }
}

generateSitemap();
