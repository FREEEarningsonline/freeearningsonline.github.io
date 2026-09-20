import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// PART 1: GLOBAL STATE & UI HELPER FUNCTIONS
// ==========================================

const GITHUB_BASE_URL = "https://raw.githubusercontent.com/freeearningsonline/Ai-Prompt-/main/images/";
const IMGBB_API_KEY = "54345d70fbd11c8a3ccd7e180c3281e2";

// Helper function to dynamically parse and normalize categories
function normalizeCategories(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.filter(Boolean).map(item => {
            if (typeof item === 'object' && item !== null) {
                return item.name || item.title || item.value || '';
            }
            return String(item).trim();
        }).filter(Boolean);
    }
    if (typeof val === 'object') {
        return Object.keys(val).map(key => {
            const item = val[key];
            if (item && typeof item === 'object') {
                return item.name || item.title || item.value || key;
            }
            return String(item).trim();
        }).filter(Boolean);
    }
    return [];
}

// Smart Media Detection & Local Video Folder Integration
function resolveMediaSrc(mediaVal) {
    if (!mediaVal) {
        return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"; 
    }
    if (typeof mediaVal === 'string' && mediaVal.match(/\.(mp4|webm|ogg)$/i)) {
        if (mediaVal.startsWith("http://") || mediaVal.startsWith("https://") || mediaVal.startsWith("data:")) {
            return mediaVal;
        }
        if (mediaVal.startsWith("/videos/")) {
            return mediaVal;
        }
        return "/videos/" + mediaVal;
    }
    if (typeof mediaVal === 'string' && (mediaVal.startsWith("http://") || mediaVal.startsWith("https://") || mediaVal.startsWith("data:"))) {
        return mediaVal;
    }
    return GITHUB_BASE_URL + mediaVal;
}
window.resolveImageSrc = resolveMediaSrc;

// Text Highlighter for Advanced Search
function highlightText(text, search) {
    if (!search || !text) return text;
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeSearch})`, 'gi');
    return text.replace(regex, `<mark class="bg-brand-500/20 text-brand-500 rounded px-0.5">$1</mark>`);
}
window.highlightText = highlightText;

function updatePageMetadata(titleSuffix, descriptionSuffix, keywordsSuffix) {
    document.title = titleSuffix ? `PromptKaro - ${titleSuffix}` : "PromptKaro - Free AI Prompt Sharing Platform";
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute('content', descriptionSuffix || "Explore, copy, and share free trending AI prompts for Midjourney, ChatGPT, and Flux AI.");
    }
    
    const metaKey = document.querySelector('meta[name="keywords"]');
    if (metaKey) {
        metaKey.setAttribute('content', keywordsSuffix || "AI Prompts, Midjourney Prompts, ChatGPT Prompts, Bing 3D Name Art, Free AI Prompts, PromptKaro");
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
}
window.updatePageMetadata = updatePageMetadata;

window.appState = {
    currentUser: null,
    currentUserData: null,
    promptsList: [],
    userPromptsList: [], 
    blogsList: [], 
    categories: [], 
    blogCategories: [],
    ads: { top: '', center: '', multiplex: '', bottom: '' }, 
    currentFilter: 'All',
    currentBlogFilter: 'All',
    isLoginMode: true,
    currentPage: 1,
    currentUserPage: 1, 
    currentBlogPage: 1,
    viewMode: 'home', 
    navigationStack: [] 
};

// Theme Preference Handling
const systemTheme = localStorage.getItem('theme') || 'dark';
if (systemTheme === 'dark') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

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
    if (deskIcon) {
        deskIcon.className = isDark ? "fa-solid fa-sun text-amber-400" : "fa-solid fa-moon text-amber-500";
    }
    if (mobIcon) {
        mobIcon.className = isDark ? "fa-solid fa-sun text-amber-400" : "fa-solid fa-moon text-amber-500";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    updateThemeIcons();

    const dSearch = document.getElementById('desktopSearch');
    const mSearch = document.getElementById('mobileSearch');
    if (dSearch) dSearch.addEventListener('input', window.handleSearch);
    if (mSearch) mSearch.addEventListener('input', window.handleSearch);

    const uImageFile = document.getElementById('uImageFile');
    const uImageFileName = document.getElementById('uImageFileName');
    if (uImageFile && uImageFileName) {
        uImageFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uImageFileName.innerText = e.target.files[0].name;
                uImageFileName.classList.add('text-purple-500');
            } else {
                uImageFileName.innerText = "Click or Drag to select an image...";
                uImageFileName.classList.remove('text-purple-500');
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedPromptId = urlParams.get('prompt');

    if (sharedPromptId) {
        window.location.href = `prompt.html?id=${sharedPromptId}`;
    }
});

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('translate-x-full');
}
window.toggleMobileMenu = toggleMobileMenu;

function switchTab(tabId, isBack = false) {
    const sections = [
        'homeExclusiveContent', 
        'categoryFiltersContainer',
        'promptsSection', 
        'userPromptsDisplaySection', 
        'adminView', 
        'blogSection', 
        'userUploadSection'
    ];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    window.appState.viewMode = tabId; 

    if (tabId === 'home') {
        ['homeExclusiveContent', 'categoryFiltersContainer', 'promptsSection', 'userPromptsDisplaySection'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('hidden');
        });
        window.appState.currentPage = 1;
        window.appState.currentUserPage = 1;
        if (typeof window.filterCategory === 'function') window.filterCategory('All');
        updatePageMetadata("Free AI Prompt Library", "Explore, copy, and share free trending AI prompts.");
    } 
    else if (tabId === 'blog') {
        const el = document.getElementById('blogSection');
        if(el) el.classList.remove('hidden');
        window.appState.currentBlogPage = 1;
        if (typeof window.renderBlogs === 'function') window.renderBlogs();
        updatePageMetadata("AI Blogs & Guides", "Read high-quality articles and tutorials on PromptKaro.");
    } 
    else if (tabId === 'admin') {
        const el = document.getElementById('adminView');
        if(el) el.classList.remove('hidden');
        updatePageMetadata("Admin Panel");
    } 
    else if (tabId === 'userUpload') {
        const el = document.getElementById('userUploadSection');
        if(el) el.classList.remove('hidden');
        updatePageMetadata("Upload Prompt", "Upload your AI prompt for free.");
    }
}
window.switchTab = switchTab;

window.handleSearch = function() {
    const searchVal = (document.getElementById('desktopSearch')?.value || document.getElementById('mobileSearch')?.value || '').toLowerCase();
    
    if (window.appState.viewMode === 'blog') {
        window.appState.currentBlogPage = 1;
        if(typeof window.renderBlogs === 'function') window.renderBlogs();
    } else {
        window.appState.currentPage = 1;
        window.appState.currentUserPage = 1;
        
        const homeExclusive = document.getElementById('homeExclusiveContent');
        
        if (searchVal) {
            if (homeExclusive) homeExclusive.classList.add('hidden');
        } else {
            if (window.appState.viewMode === 'home' && homeExclusive) {
                homeExclusive.classList.remove('hidden');
            }
        }
        
        if(typeof window.renderPrompts === 'function') window.renderPrompts();
        if(typeof window.renderUserPrompts === 'function') window.renderUserPrompts();
    }
}

function openModal(id) {
    const modalEl = document.getElementById(id);
    if(modalEl) modalEl.classList.remove('hidden');
}
window.openModal = openModal;

function closeModal(id) {
    const modalEl = document.getElementById(id);
    if(modalEl) modalEl.classList.add('hidden');
}
window.closeModal = closeModal;

function openAuthModal(mode) {
    window.appState.isLoginMode = mode === 'login';
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authSubmitBtn');

    if(title) title.innerText = window.appState.isLoginMode ? "Secure Login" : "Sign Up / Register";
    if(btn) btn.innerText = window.appState.isLoginMode ? "Login to Account" : "Register Now";
    window.openModal('authModal');
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
    window.closeModal('authModal');
}
window.closeAuthModal = closeAuthModal;

function safeCopy(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text)
            .then(() => alert("Prompt copied to clipboard successfully!"))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}
window.safeCopy = safeCopy;

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        if (document.execCommand('copy')) {
            alert("Prompt copied to clipboard!");
        } else {
            alert("Unable to copy.");
        }
    } catch (err) {
        alert("Unable to copy.");
    }
    document.body.removeChild(textArea);
}

// ==========================================
// PART 2: FIREBASE BACKEND INTEGRATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyCl5kGKi_9sbeHdlEZyqSuThQTA53bH3Po",
    authDomain: "aiprom-98a50.firebaseapp.com",
    projectId: "aiprom-98a50",
    storageBucket: "aiprom-98a50.firebasestorage.app",
    messagingSenderId: "479575775288",
    appId: "1:479575775288:web:aaeeed041501d1500aeecd",
    measurementId: "G-TYE4LJ2NRY",
    databaseURL: "https://aiprom-98a50-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const authFormEl = document.getElementById('authForm');
if (authFormEl) {
    authFormEl.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const btn = document.getElementById('authSubmitBtn');
        const originalText = btn.innerText;

        btn.disabled = true;
        btn.innerText = "Please wait...";

        try {
            if (window.appState.isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                alert("Logged in successfully!");
            } else {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await set(ref(db, `users/${userCred.user.uid}`), {
                    email: email,
                    createdAt: Date.now()
                });
                alert("Account created successfully!");
            }
            window.closeAuthModal();
            authFormEl.reset();
        } catch (error) {
            alert("Authentication Failed: " + error.message);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
}

// USER FREE PROMPT UPLOAD
const userUploadForm = document.getElementById('userUploadForm');
if (userUploadForm) {
    userUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!window.appState.currentUser) {
            alert("Please log in first!");
            window.openAuthModal('login');
            return;
        }

        const fileInput = document.getElementById('uImageFile');
        if (!fileInput || !fileInput.files.length) {
            alert("Please select an image to upload.");
            return;
        }

        const btn = document.getElementById('userUploadSubmitBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading... Please wait';

        try {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('image', file);

            const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const imgData = await imgbbRes.json();

            if (!imgData.success) {
                throw new Error("Image upload failed: " + imgData.error.message);
            }

            const payload = {
                title: document.getElementById('uTitle').value.trim(),
                tags: document.getElementById('uCategory').value,
                imageURL: imgData.data.url,
                mediaType: 'image', 
                description: document.getElementById('uDescription').value.trim(),
                uploaderUid: window.appState.currentUser.uid,
                uploaderEmail: window.appState.currentUser.email,
                views: 0,
                type: 'free',
                timestamp: Date.now()
            };

            await push(ref(db, 'userPrompts'), payload);

            alert("Prompt Successfully Uploaded!");
            userUploadForm.reset();
            window.switchTab('home');

        } catch (err) {
            alert("Upload Error: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
}

window.logout = async function() {
    await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.appState.currentUser = user;
        document.querySelectorAll('.auth-logged-in').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.auth-logged-out').forEach(el => el.classList.add('hidden'));
    } else {
        window.appState.currentUser = null;
        document.querySelectorAll('.auth-logged-in').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.auth-logged-out').forEach(el => el.classList.remove('hidden'));
    }
});

// FETCH CATEGORIES
const categoriesRef = ref(db, 'categories');
onValue(categoriesRef, (snapshot) => {
    let parsedCats = [];
    if (snapshot.exists()) {
        parsedCats = normalizeCategories(snapshot.val());
    } else {
        const defaultCats = ["Viral", "ChatGPT", "Midjourney", "Flux", "Runway", "IG Trend"];
        parsedCats = defaultCats;
    }
    window.appState.categories = parsedCats;
    renderCategoryPills(window.appState.categories);
});

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
        btn.setAttribute('data-category', filterVal);
        return btn;
    };

    container.appendChild(createBtn('All Prompts', 'All'));
    container.appendChild(createBtn('Video Prompts', 'Video Prompts'));
    container.appendChild(createBtn('Image Prompts', 'Image Prompts'));

    const uniqueCats = Array.from(new Set(categories));
    uniqueCats.forEach(cat => {
        container.appendChild(createBtn(cat, cat));
    });
}

// PROMPTS LISTING & RENDER (SEO OPTIMIZED DIRECT PAGE REDIRECT)
const promptsRef = ref(db, 'prompts');
onValue(promptsRef, (snapshot) => {
    window.appState.promptsList = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        for (let key in data) {
            window.appState.promptsList.push({ id: key, ...data[key] });
        }
    }
    renderPrompts();
});

function renderPrompts() {
    const grid = document.getElementById('promptsGrid');
    const countText = document.getElementById('promptsCount');
    
    if(!grid) return;
    grid.innerHTML = '';
    grid.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4";

    let filtered = window.appState.promptsList;

    if (window.appState.currentFilter === 'Video Prompts') {
        filtered = window.appState.promptsList.filter(p => p.mediaType === 'video' || (p.imageURL && p.imageURL.match(/\.(mp4|webm|ogg)$/i)));
    } else if (window.appState.currentFilter === 'Image Prompts') {
        filtered = window.appState.promptsList.filter(p => p.mediaType !== 'video' && (!p.imageURL || !p.imageURL.match(/\.(mp4|webm|ogg)$/i)));
    } else if (window.appState.currentFilter !== 'All') {
        filtered = window.appState.promptsList.filter(p => p.tags === window.appState.currentFilter);
    }

    const searchVal = (document.getElementById('desktopSearch')?.value || document.getElementById('mobileSearch')?.value || '').toLowerCase();
    
    if (searchVal) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchVal) || 
            (p.description && p.description.toLowerCase().includes(searchVal))
        );
    }

    if(countText) countText.innerText = `${filtered.length} free prompts`;

    filtered.forEach(p => {
        const card = document.createElement('article'); 
        card.className = "relative overflow-hidden aspect-[2/3] rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 transition cursor-pointer group flex flex-col justify-end text-slate-100";
        
        // REDIRECT TO DEDICATED SHOWCASE PAGE FOR SEO INDEXING
        card.onclick = () => window.openPromptDetail(p.id);

        const finalUrl = window.resolveImageSrc(p.imageURL);
        const isVideo = p.mediaType === 'video' || (p.imageURL && p.imageURL.match(/\.(mp4|webm|ogg)$/i));

        card.innerHTML = `
            ${isVideo ? `<video src="${finalUrl}" class="absolute inset-0 w-full h-full object-cover" muted playsinline loop></video>` : `<img src="${finalUrl}" alt="${p.title}" class="absolute inset-0 w-full h-full object-cover">`}
            <span class="absolute top-2 right-2 bg-emerald-500/90 text-[8px] px-2 py-0.5 rounded-full font-bold text-white z-10">FREE</span>
            <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent z-10">
                <h3 class="text-xs sm:text-sm font-bold text-white line-clamp-2">${p.title}</h3>
            </div>
        `;
        grid.appendChild(card);
    });
}
window.renderPrompts = renderPrompts;

// DEDICATED PAGE REDIRECT FUNCTIONS FOR GOOGLE INDEXING
window.openPromptDetail = function(id) {
    window.location.href = `prompt.html?id=${id}`;
};

window.openUserPromptDetail = function(id) {
    window.location.href = `prompt.html?id=${id}`;
};

window.filterCategory = function(cat) {
    window.appState.currentFilter = cat;
    renderPrompts();
};
