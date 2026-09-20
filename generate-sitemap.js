import fs from 'fs';

const BASE_URL = "https://freeearningsonline.github.io";
const FIREBASE_PROMPTS_URL = "https://aiprom-98a50-default-rtdb.firebaseio.com/prompts.json";
const FIREBASE_BLOGS_URL = "https://aiprom-98a50-default-rtdb.firebaseio.com/blogs.json";

async function fetchJson(url) {
    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function generateSitemap() {
    console.log("Fetching dynamic URLs from Firebase...");

    // Static Pages
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

    // Fetch Dynamic Prompts
    const promptsData = await fetchJson(FIREBASE_PROMPTS_URL);
    if (promptsData) {
        Object.keys(promptsData).forEach(id => {
            urls.push(`${BASE_URL}/prompt.html?id=${id}`);
        });
    }

    // Fetch Dynamic Blogs
    const blogsData = await fetchJson(FIREBASE_BLOGS_URL);
    if (blogsData) {
        Object.keys(blogsData).forEach(id => {
            urls.push(`${BASE_URL}/blog.html?id=${id}`);
        });
    }

    const currentDate = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    urls.forEach(url => {
        const priority = url.includes('prompt.html') || url.includes('blog.html') ? '0.8' : '1.0';
        xml += `  <url>\n`;
        xml += `    <loc>${url}</loc>\n`;
        xml += `    <lastmod>${currentDate}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    fs.writeFileSync('sitemap.xml', xml);
    console.log(`Successfully generated sitemap.xml with ${urls.length} total URLs!`);
}

generateSitemap();
