// ==========================================
// PROMPTKARO - MAIN APP SCRIPT (STATIC CDN ENGINE)
// ==========================================

const GITHUB_BASE_URL = "https://raw.githubusercontent.com/freeearningsonline/Ai-Prompt-/main/images/";

function resolveMediaSrc(mediaVal) {
    if (!mediaVal) return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"; 
    if (typeof mediaVal === 'string' && (mediaVal.startsWith("http://") || mediaVal.startsWith("https://") || mediaVal.startsWith("data:"))) {
        return mediaVal;
    }
    if (typeof mediaVal === 'string' && mediaVal.startsWith("/videos/")) {
        return mediaVal;
    }
    return GITHUB_BASE_URL + mediaVal;
}
window.resolveImageSrc = resolveMediaSrc;

function updatePageMetadata(titleSuffix, descriptionSuffix) {
    document.title = titleSuffix ? `PromptKaro - ${titleSuffix}` : "PromptKaro - Free AI Prompt Sharing Platform";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', descriptionSuffix || "Explore, copy, and share free trending AI prompts.");
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
}

window.appState = {
    localPrompts: [],
    githubAutoPrompts: [],
    promptsList: [],
    blogsList: [],
    categories: ["Viral", "IG Trend", "Boys", "Girls", "Fruit Couples 🍎🍌", "Marketing Poster", "Couple 👩‍❤️‍👨", "J🥀M", "👑Quote🦋", "Auto Gallery"],
    currentFilter: 'All',
    displayedPromptsCount: 10,
    viewMode: 'home'
};

const systemTheme = localStorage.getItem('theme') || 'dark';
if (systemTheme === 'dark') document.documentElement.classList.add('dark');
else document.documentElement.classList.remove('dark');

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons();
}
window.toggleTheme = toggleTheme;

function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const deskIcon = document.getElementById('themeIcon');
    const mobIcon = document.getElementById('mobileThemeIcon');
    if (deskIcon) deskIcon.className = isDark ? "fa-solid fa-sun text-amber-400" : "fa-solid fa-moon text-amber-500";
    if (mobIcon) mobIcon.className = isDark ? "fa-solid fa-sun text-amber-400" : "fa-solid fa-moon text-amber-500";
}

window.addEventListener('DOMContentLoaded', () => {
    updateThemeIcons();
    renderCategoryPills(window.appState.categories);
    
    // Load Data with cache-busting
    window.fetchLocalDatabase();
    window.fetchGithubAutoImages();

    const dSearch = document.getElementById('desktopSearch');
    const mSearch = document.getElementById('mobileSearch');
    if (dSearch) dSearch.addEventListener('input', window.handleSearch);
    if (mSearch) mSearch.addEventListener('input', window.handleSearch);

    const urlParams = new URLSearchParams(window.location.search);
    const sharedPromptId = urlParams.get('prompt') || urlParams.get('id');
    const sharedBlogId = urlParams.get('blog');
    const searchIntent = urlParams.get('search');

    if (searchIntent && !window.location.pathname.includes('prompt.html') && !window.location.pathname.includes('blog.html')) {
        if (dSearch) dSearch.value = searchIntent;
        if (mSearch) mSearch.value = searchIntent;
        setTimeout(() => window.handleSearch(), 100); 
    }

    if (sharedPromptId && !window.location.pathname.includes('prompt.html')) window.location.href = `prompt.html?id=${sharedPromptId}`;
    if (sharedBlogId && !window.location.pathname.includes('blog.html')) window.location.href = `blog.html?id=${sharedBlogId}`;
});

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('translate-x-full');
}
window.toggleMobileMenu = toggleMobileMenu;

function switchTab(tabId) {
    const sections = ['homeExclusiveContent', 'categoryFiltersContainer', 'promptsSection', 'blogSection', 'userUploadSection'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    window.appState.viewMode = tabId; 

    if (tabId === 'home') {
        ['homeExclusiveContent', 'categoryFiltersContainer', 'promptsSection'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('hidden');
        });
        window.appState.displayedPromptsCount = 10; 
        window.filterCategory('All');
        updatePageMetadata("Free AI Prompt Library", "Explore, copy, and share free trending AI prompts.");
    } 
    else if (tabId === 'blog') {
        const el = document.getElementById('blogSection');
        if(el) el.classList.remove('hidden');
        renderBlogs();
        updatePageMetadata("AI Blogs & Guides", "Read high-quality articles and tutorials on PromptKaro.");
    } 
}
window.switchTab = switchTab;

window.handleSearch = function() {
    const searchVal = (document.getElementById('desktopSearch')?.value || document.getElementById('mobileSearch')?.value || '').toLowerCase();
    
    if (window.appState.viewMode === 'blog') {
        renderBlogs();
    } else {
        window.appState.displayedPromptsCount = 10; 
        const homeExclusive = document.getElementById('homeExclusiveContent');
        if (searchVal) {
            if (homeExclusive) homeExclusive.classList.add('hidden');
        } else {
            if (window.appState.viewMode === 'home' && homeExclusive) homeExclusive.classList.remove('hidden');
        }
        renderPrompts();
    }
}

window.openAuthModal = function() {
    alert("🚀 PromptKaro is currently running in high-speed CDN mode!");
};
window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    if(modal) modal.classList.add('hidden');
};

// ==========================================
// DATA FETCHING & RENDERING
// ==========================================

function renderCategoryPills(categories) {
    const container = document.getElementById('categoryFiltersContainer');
    if(!container) return;
    container.innerHTML = '';
    
    const createBtn = (catName, filterVal) => {
        const btn = document.createElement('button');
        btn.onclick = () => window.filterCategory(filterVal);
        const isActive = window.appState.currentFilter === filterVal;
        btn.className = isActive 
            ? "category-btn bg-brand-500 text-white px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition shadow-sm"
            : "category-btn bg-white border border-slate-200 hover:border-brand-500 dark:bg-slate-900 dark:border-slate-800 border-slate-700 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition text-slate-900 dark:text-slate-100";
        btn.innerText = catName;
        return btn;
    };

    container.appendChild(createBtn('All Prompts', 'All'));
    container.appendChild(createBtn('Video Prompts', 'Video Prompts'));
    container.appendChild(createBtn('Image Prompts', 'Image Prompts'));
    categories.forEach(cat => {
        if(cat !== 'All' && cat !== 'Video Prompts' && cat !== 'Image Prompts') {
            container.appendChild(createBtn(cat, cat));
        }
    });
}

// Fetch prompts.json
window.fetchLocalDatabase = async function() {
    try {
        const res = await fetch("prompts.json?t=" + Date.now());
        if (!res.ok) throw new Error("prompts.json not found");
        const data = await res.json();
        
        // 1. Prompts Load
        let arr = [];
        if (data.prompts) {
            for (let subKey in data.prompts) {
                arr.push({ id: subKey, ...data.prompts[subKey] });
            }
        } else {
            for (let key in data) {
                if (data[key].title || data[key].description) {
                    arr.push({ id: key, ...data[key] });
                }
            }
        }
        window.appState.localPrompts = arr;

        // 2. Categories Load
        if (data.categories && Array.isArray(data.categories)) {
            const uniqueCats = Array.from(new Set([...data.categories, "Auto Gallery"]));
            window.appState.categories = uniqueCats;
            renderCategoryPills(window.appState.categories);
        }

        // 3. Blogs Load
        if (data.blogs) {
            let bArr = [];
            for (let bKey in data.blogs) {
                bArr.push({ id: bKey, ...data.blogs[bKey] });
            }
            window.appState.blogsList = bArr;
        }

        mergeAndRenderPrompts();
    } catch (error) {
        console.warn("Local JSON fetch info:", error);
        mergeAndRenderPrompts();
    }
};

window.fetchGithubAutoImages = async function() {
    try {
        const res = await fetch("https://api.github.com/repos/freeearningsonline/Ai-Prompt-/contents/images");
        if (!res.ok) return;
        const files = await res.json();
        
        let autoPrompts = [];
        const existingImages = window.appState.localPrompts.map(p => {
            const url = p.imageURL || p.image || "";
            return url.split('/').pop().toLowerCase();
        });

        files.forEach(file => {
            if (file.type === "file" && file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) && file.name.toLowerCase() !== 'logo.png') {
                if (!existingImages.includes(file.name.toLowerCase())) {
                    autoPrompts.push({
                        id: 'auto_' + file.sha,
                        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '), 
                        imageURL: file.download_url,
                        tags: 'Auto Gallery',
                        mediaType: 'image',
                        description: "Create a photorealistic, high quality aesthetic artwork based on this image style. Use 8K resolution, cinematic lighting, and sharp detailed composition.",
                        timestamp: 0 
                    });
                }
            }
        });
        
        window.appState.githubAutoPrompts = autoPrompts;
        mergeAndRenderPrompts();
    } catch (error) {
        console.warn("GitHub Auto-loader info:", error);
    }
};

function mergeAndRenderPrompts() {
    let combined = [...window.appState.localPrompts, ...window.appState.githubAutoPrompts];
    combined.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
    window.appState.promptsList = combined;
    renderPrompts();
}

window.loadMorePrompts = function() {
    window.appState.displayedPromptsCount += 10;
    renderPrompts();
};

function renderPrompts() {
    const grid = document.getElementById('promptsGrid');
    const countText = document.getElementById('promptsCount');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if(!grid) return;
    grid.innerHTML = '';

    let filtered = window.appState.promptsList;
    if (window.appState.currentFilter === 'Video Prompts') filtered = filtered.filter(p => p.mediaType === 'video' || (p.imageURL && p.imageURL.match(/\.(mp4|webm|ogg)$/i)));
    else if (window.appState.currentFilter === 'Image Prompts') filtered = filtered.filter(p => p.mediaType !== 'video' && (!p.imageURL || !p.imageURL.match(/\.(mp4|webm|ogg)$/i)));
    else if (window.appState.currentFilter !== 'All') filtered = filtered.filter(p => p.tags === window.appState.currentFilter);

    const searchVal = (document.getElementById('desktopSearch')?.value || document.getElementById('mobileSearch')?.value || '').toLowerCase();
    if (searchVal) filtered = filtered.filter(p => (p.title && p.title.toLowerCase().includes(searchVal)) || (p.description && p.description.toLowerCase().includes(searchVal)));

    if(countText) countText.innerText = `${filtered.length} free prompts`;

    const itemsToDisplay = filtered.slice(0, window.appState.displayedPromptsCount);

    itemsToDisplay.forEach((p, index) => {
        const card = document.createElement('a'); 
        card.href = `prompt.html?id=${p.id}`; 
        card.className = "block relative overflow-hidden aspect-[2/3] rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 transition cursor-pointer group flex flex-col justify-end text-slate-100 outline-none focus:ring-2 focus:ring-brand-500";
        
        const finalUrl = window.resolveImageSrc(p.imageURL);
        const isVideo = p.mediaType === 'video' || (p.imageURL && p.imageURL.match(/\.(mp4|webm|ogg)$/i));
        const isNew = index < 5 && !p.id.startsWith('auto_'); 

        card.innerHTML = `
            ${isVideo ? `<video src="${finalUrl}" class="absolute inset-0 w-full h-full object-cover" muted playsinline loop></video>` : `<img src="${finalUrl}" alt="${p.title || 'AI Image Prompt'}" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`}
            <div class="absolute top-2 right-2 flex gap-1 z-10">
                ${isNew ? `<span class="bg-amber-500 text-[8px] px-2 py-0.5 rounded-full font-black text-slate-950 uppercase tracking-wide animate-pulse">NEW</span>` : ''}
                <span class="bg-emerald-500/90 text-[8px] px-2 py-0.5 rounded-full font-bold text-white">FREE</span>
            </div>
            <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10">
                <h3 class="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight capitalize">${p.title || 'Untitled Prompt'}</h3>
            </div>
        `;
        grid.appendChild(card);
    });

    if (loadMoreContainer) {
        if (window.appState.displayedPromptsCount < filtered.length) loadMoreContainer.classList.remove('hidden'); 
        else loadMoreContainer.classList.add('hidden'); 
    }

    if (!window.location.pathname.includes('prompt.html') && !window.location.pathname.includes('blog.html')) {
        injectAdvancedSchema('home', null, itemsToDisplay);
    }
}
window.renderPrompts = renderPrompts;
window.openPromptDetail = function(id) { window.location.href = `prompt.html?id=${id}`; };

function renderBlogs() {
    const container = document.getElementById('blogsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    let filtered = window.appState.blogsList;
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    filtered.forEach(blog => {
        const card = document.createElement('a');
        card.href = `blog.html?id=${blog.id}`; 
        card.className = "block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition hover:shadow-md hover:-translate-y-1 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500";
        
        const finalImg = window.resolveImageSrc(blog.imageURL);
        const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Recent';

        card.innerHTML = `
            <img src="${finalImg}" alt="${blog.title}" loading="lazy" class="w-full h-48 object-cover">
            <div class="p-5 flex-grow flex flex-col justify-between space-y-3">
                <div class="space-y-2">
                    <span class="text-[10px] bg-brand-500/10 text-brand-500 font-bold px-2 py-0.5 rounded-full uppercase">${blog.category || 'AI Guide'}</span>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">${blog.title}</h3>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span>${dateStr}</span>
                    <span class="font-bold text-brand-500">Read Article ➔</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
window.renderBlogs = renderBlogs;
window.openBlogDetail = function(id) { window.location.href = `blog.html?id=${id}`; };
window.filterCategory = function(cat) {
    window.appState.currentFilter = cat;
    window.appState.displayedPromptsCount = 10;
    renderPrompts();
};

// ==========================================
// DYNAMIC SCHEMA ENGINE
// ==========================================
function updateMetaTag(id, content) {
    const el = document.getElementById(id);
    if (el && content) el.setAttribute(el.hasAttribute('content') ? 'content' : 'href', content);
}
function cleanSchemaObj(obj) {
    for (let propName in obj) {
        if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") delete obj[propName];
        else if (typeof obj[propName] === 'object' && !Array.isArray(obj[propName])) cleanSchemaObj(obj[propName]);
    }
    return obj;
}

function injectAdvancedSchema(pageType, data = null, listData = []) {
    try {
        const baseUrl = "https://freeearningsonline.github.io/";
        const currentUrl = window.location.href;
        const logoUrl = "https://raw.githubusercontent.com/freeearningsonline/Ai-Prompt-/main/images/logo.png";
        
        let graph = [];
        graph.push({ "@type": "Organization", "@id": baseUrl + "#organization", "name": "PromptKaro", "url": baseUrl, "logo": { "@type": "ImageObject", "url": logoUrl } });
        graph.push({ "@type": "WebSite", "@id": baseUrl + "#website", "url": baseUrl, "name": "PromptKaro", "publisher": { "@id": baseUrl + "#organization" }, "potentialAction": { "@type": "SearchAction", "target": baseUrl + "?search={search_term_string}", "query-input": "required name=search_term_string" } });

        if (pageType === 'home') {
            graph.push({ "@type": "CollectionPage", "@id": currentUrl + "#webpage", "url": currentUrl, "name": "PromptKaro", "isPartOf": { "@id": baseUrl + "#website" } });
            if (listData && listData.length > 0) graph.push({ "@type": "ItemList", "@id": currentUrl + "#itemlist", "itemListElement": listData.map((item, idx) => ({ "@type": "ListItem", "position": idx + 1, "url": baseUrl + "prompt.html?id=" + item.id, "name": item.title })) });
            graph.push({ "@type": "PodcastSeries", "@id": baseUrl + "#podcast", "name": "Digital Business & AI Podcast", "url": baseUrl, "provider": { "@id": baseUrl + "#organization" } });
        }

        const schemaScript = document.getElementById('dynamic-schema');
        if (schemaScript) schemaScript.textContent = JSON.stringify(cleanSchemaObj({ "@context": "https://schema.org", "@graph": graph }));
    } catch (e) {}
}
