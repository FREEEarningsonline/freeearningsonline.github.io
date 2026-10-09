// ==========================================
// PROMPTKARO - MAIN APP SCRIPT (RELIABLE DATA LOADER)
// Updated: safer rendering, robust JSON parsing, clearer loading errors
// ==========================================

const GITHUB_BASE_URL = "https://raw.githubusercontent.com/freeearningsonline/Ai-Prompt-/main/images/";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";

function resolveMediaSrc(mediaVal) {
    if (!mediaVal || typeof mediaVal !== "string") return FALLBACK_IMAGE;

    const value = mediaVal.trim();
    if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;
    if (value.startsWith("/")) return value;
    if (/^videos\//i.test(value)) return "/" + value;
    return GITHUB_BASE_URL + value.replace(/^\.?\//, "");
}
window.resolveImageSrc = resolveMediaSrc;

function updatePageMetadata(titleSuffix, descriptionSuffix) {
    document.title = titleSuffix
        ? `PromptKaro - ${titleSuffix}`
        : "PromptKaro - Free AI Prompt Sharing Platform";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute(
            "content",
            descriptionSuffix || "Explore, copy, and share free trending AI prompts."
        );
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
}

window.appState = {
    localPrompts: [],
    githubAutoPrompts: [],
    promptsList: [],
    blogsList: [],
    categories: ["Viral", "IG Trend", "Boys", "Girls", "Fruit Couples 🍎🍌", "Marketing Poster", "Couple 👩‍❤️‍👨", "J🥀M", "👑Quote🦋", "Auto Gallery"],
    currentFilter: "All",
    displayedPromptsCount: 10,
    viewMode: "home",
    dataLoaded: false,
    dataError: false
};

try {
    const systemTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("dark", systemTheme === "dark");
} catch (_) {
    document.documentElement.classList.add("dark");
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch (_) {}
    updateThemeIcons();
}
window.toggleTheme = toggleTheme;

function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains("dark");
    const deskIcon = document.getElementById("themeIcon");
    const mobIcon = document.getElementById("mobileThemeIcon");
    if (deskIcon) deskIcon.className = isDark
        ? "fa-solid fa-sun text-amber-400"
        : "fa-solid fa-moon text-amber-500";
    if (mobIcon) mobIcon.className = isDark
        ? "fa-solid fa-sun text-amber-400"
        : "fa-solid fa-moon text-amber-500";
}

window.addEventListener("DOMContentLoaded", () => {
    updateThemeIcons();
    renderCategoryPills(window.appState.categories);

    // Load the main repository's own JSON first. Older external sources are fallbacks only.
    window.fetchLocalDatabase();
    window.fetchGithubAutoImages();

    const dSearch = document.getElementById("desktopSearch");
    const mSearch = document.getElementById("mobileSearch");
    if (dSearch) dSearch.addEventListener("input", window.handleSearch);
    if (mSearch) mSearch.addEventListener("input", window.handleSearch);

    const urlParams = new URLSearchParams(window.location.search);
    const sharedPromptId = urlParams.get("prompt") || urlParams.get("id");
    const sharedBlogId = urlParams.get("blog");
    const searchIntent = urlParams.get("search");

    if (searchIntent && !window.location.pathname.includes("prompt.html") &&
        !window.location.pathname.includes("blog.html")) {
        if (dSearch) dSearch.value = searchIntent;
        if (mSearch) mSearch.value = searchIntent;
        setTimeout(() => window.handleSearch(), 100);
    }

    if (sharedPromptId && !window.location.pathname.includes("prompt.html")) {
        window.location.href = `prompt.html?id=${encodeURIComponent(sharedPromptId)}`;
        return;
    }
    if (sharedBlogId && !window.location.pathname.includes("blog.html")) {
        window.location.href = `blog.html?id=${encodeURIComponent(sharedBlogId)}`;
    }
});

function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    if (menu) menu.classList.toggle("translate-x-full");
}
window.toggleMobileMenu = toggleMobileMenu;

function switchTab(tabId) {
    const sections = ["homeExclusiveContent", "categoryFiltersContainer", "promptsSection", "blogSection", "userUploadSection"];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    window.appState.viewMode = tabId;

    if (tabId === "home") {
        ["homeExclusiveContent", "categoryFiltersContainer", "promptsSection"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove("hidden");
        });
        window.appState.displayedPromptsCount = 10;
        window.filterCategory("All");
        updatePageMetadata("Free AI Prompt Library", "Explore, copy, and share free trending AI prompts.");
    } else if (tabId === "blog") {
        const el = document.getElementById("blogSection");
        if (el) el.classList.remove("hidden");
        renderBlogs();
        updatePageMetadata("AI Blogs & Guides", "Read helpful articles and tutorials on PromptKaro.");
    }
}
window.switchTab = switchTab;

window.handleSearch = function () {
    const d = document.getElementById("desktopSearch");
    const m = document.getElementById("mobileSearch");
    const searchVal = ((d && d.value) || (m && m.value) || "").trim().toLowerCase();

    if (window.appState.viewMode === "blog") {
        renderBlogs(searchVal);
        return;
    }

    window.appState.displayedPromptsCount = 10;
    const homeExclusive = document.getElementById("homeExclusiveContent");
    if (homeExclusive) {
        homeExclusive.classList.toggle("hidden", Boolean(searchVal));
    }
    renderPrompts();
};

window.openAuthModal = function () {
    alert("PromptKaro account features are not available yet.");
};
window.closeAuthModal = function () {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.add("hidden");
};

function renderCategoryPills(categories) {
    const container = document.getElementById("categoryFiltersContainer");
    if (!container) return;
    container.innerHTML = "";

    const createBtn = (catName, filterVal) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.onclick = () => window.filterCategory(filterVal);
        const isActive = window.appState.currentFilter === filterVal;
        btn.className = isActive
            ? "category-btn bg-brand-500 text-white px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition shadow-sm"
            : "category-btn bg-white border border-slate-200 hover:border-brand-500 dark:bg-slate-900 dark:border-slate-800 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition text-slate-900 dark:text-slate-100";
        btn.textContent = catName;
        return btn;
    };

    container.appendChild(createBtn("All Prompts", "All"));
    container.appendChild(createBtn("Video Prompts", "Video Prompts"));
    container.appendChild(createBtn("Image Prompts", "Image Prompts"));
    (Array.isArray(categories) ? categories : []).forEach(cat => {
        if (cat && !["All", "Video Prompts", "Image Prompts"].includes(cat)) {
            container.appendChild(createBtn(String(cat), String(cat)));
        }
    });
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeCollection(value, kind) {
    if (Array.isArray(value)) {
        return value.filter(isRecord).map((item, index) => ({
            ...item,
            id: item.id !== undefined && item.id !== null ? String(item.id) : `${kind}_${index + 1}`
        }));
    }
    if (isRecord(value)) {
        return Object.entries(value)
            .filter(([, item]) => isRecord(item))
            .map(([key, item]) => ({
                ...item,
                id: item.id !== undefined && item.id !== null ? String(item.id) : String(key)
            }));
    }
    return [];
}

function normalizeDatabase(raw) {
    if (Array.isArray(raw)) {
        return { prompts: normalizeCollection(raw, "prompt"), blogs: [], categories: [] };
    }
    if (!isRecord(raw)) return null;

    // Accept both a wrapped JSON file ({prompts, blogs, categories}) and
    // a Firebase-style root object containing prompt records directly.
    const hasKnownKeys = ["prompts", "blogs", "categories"].some(key =>
        Object.prototype.hasOwnProperty.call(raw, key)
    );

    let prompts = [];
    if (raw.prompts !== undefined) prompts = normalizeCollection(raw.prompts, "prompt");
    else if (!hasKnownKeys) {
        prompts = Object.entries(raw)
            .filter(([, item]) => isRecord(item) && (item.title || item.description || item.prompt))
            .map(([key, item]) => ({
                ...item,
                id: item.id !== undefined && item.id !== null ? String(item.id) : String(key)
            }));
    }

    return {
        prompts,
        blogs: normalizeCollection(raw.blogs, "blog"),
        categories: Array.isArray(raw.categories) ? raw.categories.filter(Boolean).map(String) : []
    };
}

window.fetchLocalDatabase = async function () {
    const stamp = Date.now();
    const sources = [
        `./prompts.json?t=${stamp}`,
        `prompts.json?t=${stamp}`,
        "https://raw.githubusercontent.com/FREEEarningsonline/freeearningsonline.github.io/main/prompts.json",
        "https://raw.githubusercontent.com/freeearningsonline/Ai-Prompt-/main/prompts.json",
        "https://aiprom-98a50-default-rtdb.firebaseio.com/.json"
    ];

    let normalized = null;
    let lastError = null;

    for (const url of [...new Set(sources)]) {
        try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} for ${url}`);
                continue;
            }

            const raw = await response.json();
            const candidate = normalizeDatabase(raw);

            // Do not stop at an empty Firebase root or malformed/irrelevant JSON.
            if (candidate && (
                candidate.prompts.length > 0 ||
                candidate.blogs.length > 0 ||
                candidate.categories.length > 0
            )) {
                normalized = candidate;
                break;
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (normalized) {
        window.appState.localPrompts = normalized.prompts;
        window.appState.blogsList = normalized.blogs;

        if (normalized.categories.length) {
            window.appState.categories = Array.from(new Set([
                ...normalized.categories,
                "Auto Gallery"
            ]));
            renderCategoryPills(window.appState.categories);
        }

        window.appState.dataLoaded = true;
        window.appState.dataError = false;
        mergeAndRenderPrompts();
        renderBlogs();
        return;
    }

    window.appState.dataLoaded = true;
    window.appState.dataError = true;
    mergeAndRenderPrompts();

    const grid = document.getElementById("promptsGrid");
    if (grid && !window.appState.promptsList.length) {
        grid.innerHTML = "";
        const message = document.createElement("div");
        message.className = "col-span-full rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900";
        message.textContent = "Prompts abhi load nahi ho sake. Internet connection check karein aur page refresh karein.";
        grid.appendChild(message);
    }
    if (lastError) console.warn("PromptKaro: all prompt data sources failed.", lastError);
};

window.fetchGithubAutoImages = async function () {
    try {
        const response = await fetch(
            "https://api.github.com/repos/freeearningsonline/Ai-Prompt-/contents/images",
            { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
        );
        if (!response.ok) return;

        const files = await response.json();
        if (!Array.isArray(files)) return;

        const existingImages = new Set(window.appState.localPrompts.map(p => {
            const url = String(p.imageURL || p.image || "");
            try { return decodeURIComponent(url.split("?")[0].split("/").pop()).toLowerCase(); }
            catch (_) { return url.split("?")[0].split("/").pop().toLowerCase(); }
        }));

        const autoPrompts = files
            .filter(file => file && file.type === "file" &&
                /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name || "") &&
                String(file.name).toLowerCase() !== "logo.png")
            .filter(file => !existingImages.has(String(file.name).toLowerCase()))
            .map(file => ({
                id: `auto_${file.sha || file.name}`,
                title: String(file.name).replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
                imageURL: file.download_url,
                tags: "Auto Gallery",
                mediaType: "image",
                description: "Use this image as visual inspiration and create an original artwork with a clear subject, balanced composition, and detailed lighting.",
                timestamp: 0
            }));

        window.appState.githubAutoPrompts = autoPrompts;
        mergeAndRenderPrompts();
    } catch (error) {
        // Optional gallery source: failure should not block prompts.json.
        console.warn("PromptKaro: automatic image gallery unavailable.", error);
    }
};

function mergeAndRenderPrompts() {
    const combined = [
        ...(Array.isArray(window.appState.localPrompts) ? window.appState.localPrompts : []),
        ...(Array.isArray(window.appState.githubAutoPrompts) ? window.appState.githubAutoPrompts : [])
    ];

    const seen = new Set();
    window.appState.promptsList = combined.filter(prompt => {
        const id = String(prompt.id ?? "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    }).sort((a, b) => toTimestamp(b.timestamp || b.createdAt) - toTimestamp(a.timestamp || a.createdAt));

    renderPrompts();
}

function toTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && value.trim() !== "") return numeric;
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

window.loadMorePrompts = function () {
    window.appState.displayedPromptsCount += 10;
    renderPrompts();
};

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

function renderPrompts() {
    const grid = document.getElementById("promptsGrid");
    const countText = document.getElementById("promptsCount");
    const loadMoreContainer = document.getElementById("loadMoreContainer");
    if (!grid) return;

    grid.innerHTML = "";
    let filtered = window.appState.promptsList.slice();

    if (window.appState.currentFilter === "Video Prompts") {
        filtered = filtered.filter(p => p.mediaType === "video" || /\.(mp4|webm|ogg)(\?|$)/i.test(String(p.imageURL || "")));
    } else if (window.appState.currentFilter === "Image Prompts") {
        filtered = filtered.filter(p => p.mediaType !== "video" && !/\.(mp4|webm|ogg)(\?|$)/i.test(String(p.imageURL || "")));
    } else if (window.appState.currentFilter !== "All") {
        filtered = filtered.filter(p => {
            const tags = Array.isArray(p.tags) ? p.tags : [p.tags];
            return tags.map(tag => String(tag || "").trim()).includes(window.appState.currentFilter);
        });
    }

    const d = document.getElementById("desktopSearch");
    const m = document.getElementById("mobileSearch");
    const searchVal = ((d && d.value) || (m && m.value) || "").trim().toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(p =>
            String(p.title || "").toLowerCase().includes(searchVal) ||
            String(p.description || p.prompt || "").toLowerCase().includes(searchVal) ||
            (Array.isArray(p.tags) ? p.tags.join(" ") : String(p.tags || "")).toLowerCase().includes(searchVal)
        );
    }

    if (countText) countText.textContent = `${filtered.length} free prompts`;
    const itemsToDisplay = filtered.slice(0, window.appState.displayedPromptsCount);

    itemsToDisplay.forEach((p, index) => {
        const card = document.createElement("a");
        const id = String(p.id ?? "");
        card.href = `prompt.html?id=${encodeURIComponent(id)}`;
        card.className = "block relative overflow-hidden aspect-[2/3] rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 transition cursor-pointer group flex flex-col justify-end text-slate-100 outline-none focus:ring-2 focus:ring-brand-500";

        const rawMedia = p.imageURL || p.image || p.thumbnail || "";
        const finalUrl = window.resolveImageSrc(rawMedia);
        const isVideo = p.mediaType === "video" || /\.(mp4|webm|ogg)(\?|$)/i.test(String(rawMedia));
        const isNew = index < 5 && !id.startsWith("auto_");

        const media = isVideo ? document.createElement("video") : document.createElement("img");
        media.src = finalUrl;
        media.className = "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500";
        if (isVideo) {
            media.muted = true;
            media.playsInline = true;
            media.loop = true;
            media.preload = "none";
        } else {
            media.alt = String(p.title || "AI Image Prompt");
            media.loading = "lazy";
            media.onerror = () => { media.onerror = null; media.src = FALLBACK_IMAGE; };
        }
        card.appendChild(media);

        const badges = document.createElement("div");
        badges.className = "absolute top-2 right-2 flex gap-1 z-10";
        if (isNew) {
            const newBadge = document.createElement("span");
            newBadge.className = "bg-amber-500 text-[8px] px-2 py-0.5 rounded-full font-black text-slate-950 uppercase tracking-wide";
            newBadge.textContent = "NEW";
            badges.appendChild(newBadge);
        }
        const freeBadge = document.createElement("span");
        freeBadge.className = "bg-emerald-500/90 text-[8px] px-2 py-0.5 rounded-full font-bold text-white";
        freeBadge.textContent = "FREE";
        badges.appendChild(freeBadge);
        card.appendChild(badges);

        const footer = document.createElement("div");
        footer.className = "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10";
        const heading = document.createElement("h3");
        heading.className = "text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight capitalize";
        heading.textContent = String(p.title || "Untitled Prompt");
        footer.appendChild(heading);
        card.appendChild(footer);

        grid.appendChild(card);
    });

    if (loadMoreContainer) {
        loadMoreContainer.classList.toggle("hidden", window.appState.displayedPromptsCount >= filtered.length);
    }

    if (!window.location.pathname.includes("prompt.html") &&
        !window.location.pathname.includes("blog.html")) {
        injectAdvancedSchema("home", null, itemsToDisplay);
    }
}
window.renderPrompts = renderPrompts;
window.openPromptDetail = function (id) {
    window.location.href = `prompt.html?id=${encodeURIComponent(String(id))}`;
};

function renderBlogs(searchVal = "") {
    const container = document.getElementById("blogsContainer");
    if (!container) return;
    container.innerHTML = "";

    const filtered = (Array.isArray(window.appState.blogsList) ? window.appState.blogsList : [])
        .slice()
        .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
        .filter(blog => !searchVal ||
            String(blog.title || "").toLowerCase().includes(searchVal) ||
            String(blog.description || blog.excerpt || "").toLowerCase().includes(searchVal));

    filtered.forEach(blog => {
        const card = document.createElement("a");
        card.href = `blog.html?id=${encodeURIComponent(String(blog.id ?? ""))}`;
        card.className = "block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition hover:shadow-md hover:-translate-y-1 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500";

        const image = document.createElement("img");
        image.src = window.resolveImageSrc(blog.imageURL || blog.image || "");
        image.alt = String(blog.title || "AI Guide");
        image.loading = "lazy";
        image.className = "w-full h-48 object-cover";
        image.onerror = () => { image.onerror = null; image.src = FALLBACK_IMAGE; };
        card.appendChild(image);

        const content = document.createElement("div");
        content.className = "p-5 flex-grow flex flex-col justify-between space-y-3";
        const top = document.createElement("div");
        top.className = "space-y-2";
        const category = document.createElement("span");
        category.className = "text-[10px] bg-brand-500/10 text-brand-500 font-bold px-2 py-0.5 rounded-full uppercase";
        category.textContent = String(blog.category || "AI Guide");
        const title = document.createElement("h3");
        title.className = "text-sm font-bold text-slate-900 dark:text-white line-clamp-2";
        title.textContent = String(blog.title || "Untitled article");
        top.append(category, title);

        const bottom = document.createElement("div");
        bottom.className = "flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800";
        const date = document.createElement("span");
        date.textContent = blog.createdAt ? new Date(toTimestamp(blog.createdAt)).toLocaleDateString() : "Recent";
        const read = document.createElement("span");
        read.className = "font-bold text-brand-500";
        read.textContent = "Read Article ➔";
        bottom.append(date, read);
        content.append(top, bottom);
        card.appendChild(content);
        container.appendChild(card);
    });
}
window.renderBlogs = renderBlogs;
window.openBlogDetail = function (id) {
    window.location.href = `blog.html?id=${encodeURIComponent(String(id))}`;
};

window.filterCategory = function (cat) {
    window.appState.currentFilter = cat;
    window.appState.displayedPromptsCount = 10;
    renderCategoryPills(window.appState.categories);
    renderPrompts();
};

function cleanSchemaObj(obj) {
    if (Array.isArray(obj)) return obj.map(cleanSchemaObj);
    if (!obj || typeof obj !== "object") return obj;
    for (const propName of Object.keys(obj)) {
        const value = obj[propName];
        if (value === null || value === undefined || value === "") delete obj[propName];
        else if (typeof value === "object") obj[propName] = cleanSchemaObj(value);
    }
    return obj;
}

function injectAdvancedSchema(pageType, data = null, listData = []) {
    try {
        const baseUrl = "https://freeearningsonline.github.io/";
        const currentUrl = window.location.href;
        const logoUrl = "https://raw.githubusercontent.com/freeearningsonline/Ai-Prompt-/main/images/logo.png";
        const graph = [
            {
                "@type": "Organization",
                "@id": baseUrl + "#organization",
                "name": "PromptKaro",
                "url": baseUrl,
                "logo": { "@type": "ImageObject", "url": logoUrl }
            },
            {
                "@type": "WebSite",
                "@id": baseUrl + "#website",
                "url": baseUrl,
                "name": "PromptKaro",
                "publisher": { "@id": baseUrl + "#organization" },
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": baseUrl + "?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                }
            }
        ];

        if (pageType === "home") {
            graph.push({
                "@type": "CollectionPage",
                "@id": currentUrl + "#webpage",
                "url": currentUrl,
                "name": "PromptKaro - Free AI Prompt Library",
                "isPartOf": { "@id": baseUrl + "#website" }
            });
            if (Array.isArray(listData) && listData.length) {
                graph.push({
                    "@type": "ItemList",
                    "@id": currentUrl + "#itemlist",
                    "itemListElement": listData.map((item, index) => ({
                        "@type": "ListItem",
                        "position": index + 1,
                        "url": baseUrl + "prompt.html?id=" + encodeURIComponent(String(item.id ?? "")),
                        "name": String(item.title || "AI Prompt")
                    }))
                });
            }
        }

        const schemaScript = document.getElementById("dynamic-schema");
        if (schemaScript) {
            schemaScript.textContent = JSON.stringify(cleanSchemaObj({
                "@context": "https://schema.org",
                "@graph": graph
            }));
        }
    } catch (error) {
        console.warn("PromptKaro: structured data could not be updated.", error);
    }
}
