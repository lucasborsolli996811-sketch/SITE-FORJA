/* ==========================================
   FORJA — Firebase Cloud Database (Secure Mode)
   ========================================== */

const firebaseConfig = {
    apiKey: "AIzaSyA4AWVBOfVCKmTQUOPNHvaMFsdyscqTMK8",
    authDomain: "forja-db.firebaseapp.com",
    projectId: "forja-db",
    storageBucket: "forja-db.firebasestorage.app",
    messagingSenderId: "895147560900",
    appId: "1:895147560900:web:13c347dc25eef98ed31e91"
};

// Initialize Firebase (Compat SDK must be loaded in HTML before data.js)
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;

const STORAGE_KEY = 'forja_inventory';
const CLIENTS_KEY = 'forja_clients';
const BUDGETS_KEY = 'forja_budgets';
const LAST_NUM_KEY = 'forja_last_budget_num';

// Cache em Memória
let cachedData = {
    inventory: [],
    clients: [],
    budgets: [],
    lastBudgetNum: 12001
};

// Auth listener callback
let onAuthStateChangeCallback = null;

if (auth) {
    auth.onAuthStateChanged((user) => {
        if (onAuthStateChangeCallback) {
            onAuthStateChangeCallback(user);
        }
    });
}

// --- Authentication Operations ---
function loginAdmin(email, password) {
    if (!auth) return Promise.reject("Firebase Auth não carregado.");
    return auth.signInWithEmailAndPassword(email, password);
}

function logoutAdmin() {
    if (!auth) return Promise.resolve();
    return auth.signOut();
}

function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

function setAuthStateListener(cb) {
    onAuthStateChangeCallback = cb;
}

// --- Sincronização Pública (Apenas Estoque) ---
async function syncLoadPublic() {
    if (!db) {
        console.warn("Firebase não inicializado. Usando banco local (localStorage).");
        loadFromLocalStorage();
        return;
    }
    try {
        const invSnap = await db.collection('inventory').get();
        if (!invSnap.empty) {
            cachedData.inventory = invSnap.docs.map(d => d.data());
        }
        console.log("Catálogo carregado da nuvem (Public).");
    } catch (err) {
        console.warn("Erro ao carregar catálogo público da nuvem:", err);
        loadFromLocalStorage();
    }
}

// --- Sincronização Privada (Estoque, Clientes, Orçamentos) ---
async function syncLoadAdmin() {
    if (!db) {
        console.warn("Firebase não inicializado. Usando banco local (localStorage).");
        alert("Erro Crítico: Os scripts do Firebase não carregaram. Verifique a internet ou bloqueadores de anúncios.");
        loadFromLocalStorage();
        return;
    }
    
    // Check if logged in first to avoid permission denied
    if (!getCurrentUser()) {
        console.error("Usuário não autenticado. Acesso negado às coleções privadas.");
        return Promise.reject("Não autenticado");
    }

    try {
        let isEmpty = true;

        const invSnap = await db.collection('inventory').get();
        if (!invSnap.empty) {
            cachedData.inventory = invSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        const cliSnap = await db.collection('clients').get();
        if (!cliSnap.empty) {
            cachedData.clients = cliSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        const budSnap = await db.collection('budgets').get();
        if (!budSnap.empty) {
            cachedData.budgets = budSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        const confSnap = await db.collection('config').doc('main').get();
        if (confSnap.exists) {
            cachedData.lastBudgetNum = confSnap.data().lastBudgetNum || 12001;
        }

        if (isEmpty) {
            console.log("Firebase está vazio. Migrando dados do LocalStorage para a nuvem...");
            loadFromLocalStorage(); // Carrega o que já existia no PC dele
            syncSave(); // Força o envio (upload) de tudo pro Firebase
            alert("Dados sincronizados com o Firebase pela primeira vez!");
        } else {
            console.log("Banco de dados sincronizado com Firebase com sucesso (Admin).");
            saveToLocalStorage(); // Mantém cópia local para rapidez
        }
    } catch (err) {
        console.warn("Erro ao sincronizar com Firebase, usando backup local:", err);
        alert("Erro no Firebase (Regras/Conexão): " + err.message);
        loadFromLocalStorage();
    }
}

// Retém compatibilidade para salvar tudo se necessário
function syncSave() {
    saveToLocalStorage();
    if (!db || !getCurrentUser()) return; // Somente salva se logado

    cachedData.inventory.forEach(p => {
        db.collection('inventory').doc(p.id).set(p);
    });
    cachedData.clients.forEach(c => {
        db.collection('clients').doc(c.id).set(c);
    });
    cachedData.budgets.forEach(b => {
        db.collection('budgets').doc(b.number.toString()).set(b);
    });
    db.collection('config').doc('main').set({ lastBudgetNum: cachedData.lastBudgetNum });
}

function loadFromLocalStorage() {
    cachedData.inventory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cachedData.clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    cachedData.budgets = JSON.parse(localStorage.getItem(BUDGETS_KEY) || '[]');
    cachedData.lastBudgetNum = parseInt(localStorage.getItem(LAST_NUM_KEY) || '12001');
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData.inventory));
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(cachedData.clients));
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(cachedData.budgets));
    localStorage.setItem(LAST_NUM_KEY, cachedData.lastBudgetNum.toString());
}

// === INVENTORY OPERATIONS ===
function getInventory() {
    return cachedData.inventory;
}

function saveInventory(inventory) {
    cachedData.inventory = inventory;
    saveToLocalStorage();
}

function generateProductId(brand) {
    const slug = brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${slug}-${Date.now()}`;
}

function addProduct(product) {
    const inventory = getInventory();
    if (!product.id) {
        product.id = generateProductId(product.brand);
    }
    product.soldCount = product.soldCount || 0;
    product.quotedCount = product.quotedCount || 0;
    product.buyPrice = parseFloat(product.buyPrice) || 0;
    product.sellPrice = parseFloat(product.sellPrice) || 0;
    product.buyLink = product.buyLink || '';
    
    inventory.push(product);
    saveInventory(inventory);
    
    if (db && getCurrentUser()) db.collection('inventory').doc(product.id).set(product);
}

function updateProduct(id, updatedFields) {
    const inventory = getInventory();
    const index = inventory.findIndex(p => p.id === id);
    if (index !== -1) {
        inventory[index] = { ...inventory[index], ...updatedFields };
        saveInventory(inventory);
        if (db && getCurrentUser()) db.collection('inventory').doc(id).update(updatedFields);
    }
}

function deleteProduct(id) {
    let inventory = getInventory();
    inventory = inventory.filter(p => p.id !== id);
    saveInventory(inventory);
    if (db && getCurrentUser()) db.collection('inventory').doc(id).delete();
}

function getAvailableCatalog() {
    const inventory = getInventory();
    const available = inventory.filter(p => parseInt(p.stock) > 0);
    const grouped = {};
    available.forEach(p => {
        const b = p.brand.toUpperCase();
        if (!grouped[b]) grouped[b] = [];
        grouped[b].push(p);
    });
    return grouped;
}

function registerSale(id, qty) {
    const inventory = getInventory();
    const index = inventory.findIndex(p => p.id === id);
    if (index !== -1) {
        const p = inventory[index];
        const saleQty = Math.min(qty, p.stock);
        if (saleQty > 0) {
            p.stock -= saleQty;
            p.soldCount = (p.soldCount || 0) + saleQty;
            saveInventory(inventory);
            if (db && getCurrentUser()) {
                db.collection('inventory').doc(id).update({
                    stock: p.stock,
                    soldCount: p.soldCount
                });
            }
            return true;
        }
    }
    return false;
}

function registerQuote(id, qty) {
    const inventory = getInventory();
    const index = inventory.findIndex(p => p.id === id);
    if (index !== -1) {
        const p = inventory[index];
        p.quotedCount = (p.quotedCount || 0) + qty;
        saveInventory(inventory);
        // This can be called from public view, so check if auth is available. 
        // Oh wait, if public users add items to cart, this registerQuote runs when they request quote.
        // If they are not logged in, they CANNOT write to 'inventory' if rules require auth!
        // For now we allow write if auth, but if public needs to update quotedCount we would need to allow public updates to quotedCount or use a Cloud Function.
        // To keep it simple, public doesn't update quotedCount on Firebase, only locally. Admin will sync it later or it's just a local metric.
        if (db && getCurrentUser()) {
            db.collection('inventory').doc(id).update({ quotedCount: p.quotedCount }).catch(e=>console.log(e));
        }
    }
}

// === CLIENT OPERATIONS ===
function getClients() {
    return cachedData.clients;
}

function saveClients(clients) {
    cachedData.clients = clients;
    saveToLocalStorage();
}

function addClient(client) {
    const clients = getClients();
    client.id = `client-${Date.now()}`;
    clients.push(client);
    saveClients(clients);
    if (db && getCurrentUser()) db.collection('clients').doc(client.id).set(client);
    return client;
}

function deleteClient(id) {
    let clients = getClients();
    clients = clients.filter(c => c.id !== id);
    saveClients(clients);
    if (db && getCurrentUser()) db.collection('clients').doc(id).delete();
}

function updateClient(id, updatedFields) {
    const clients = getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
        clients[index] = { ...clients[index], ...updatedFields };
        saveClients(clients);
        if (db && getCurrentUser()) db.collection('clients').doc(id).update(updatedFields);
        return true;
    }
    return false;
}

// === BUDGET OPERATIONS ===
function getBudgets() {
    return cachedData.budgets;
}

function saveBudgets(budgets) {
    cachedData.budgets = budgets;
    saveToLocalStorage();
}

function getNextBudgetNumber() {
    return cachedData.lastBudgetNum + 1;
}

function addBudget(budget) {
    const budgets = getBudgets();
    budget.number = getNextBudgetNumber();
    budgets.push(budget);
    cachedData.lastBudgetNum = budget.number;
    saveBudgets(budgets);
    
    if (db && getCurrentUser()) {
        db.collection('budgets').doc(budget.number.toString()).set(budget);
        db.collection('config').doc('main').set({ lastBudgetNum: cachedData.lastBudgetNum });
    }
    return budget.number;
}

function updateBudgetStatus(number, status) {
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.number === parseInt(number));
    if (index !== -1) {
        budgets[index].status = status;
        saveBudgets(budgets);
        if (db && getCurrentUser()) db.collection('budgets').doc(number.toString()).update({ status: status });
        return true;
    }
    return false;
}

function deleteBudget(number) {
    let budgets = getBudgets();
    budgets = budgets.filter(b => b.number !== parseInt(number));
    saveBudgets(budgets);
    if (db && getCurrentUser()) db.collection('budgets').doc(number.toString()).delete();
}

// === DASHBOARD STATISTICS ===
function getDashboardStats() {
    const inventory = getInventory();
    
    let totalSpent = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    
    inventory.forEach(p => {
        const buy = parseFloat(p.buyPrice) || 0;
        const sell = parseFloat(p.sellPrice) || 0;
        const stock = parseInt(p.stock) || 0;
        const sold = parseInt(p.soldCount) || 0;
        
        totalSpent += (stock + sold) * buy;
        totalRevenue += sold * sell;
        totalProfit += sold * (sell - buy);
    });
    
    const topSold = [...inventory]
        .filter(p => p.soldCount > 0)
        .sort((a, b) => b.soldCount - a.soldCount)
        .slice(0, 5);
        
    const topQuoted = [...inventory]
        .filter(p => p.quotedCount > 0)
        .sort((a, b) => b.quotedCount - a.quotedCount)
        .slice(0, 5);
        
    return {
        totalSpent,
        totalRevenue,
        totalProfit,
        topSold,
        topQuoted
    };
}

// Expor banco
window.ForjaDB = {
    // Sync Functions
    syncLoadAdmin,
    syncLoadPublic,
    syncSave,
    
    // Auth Functions
    loginAdmin,
    logoutAdmin,
    getCurrentUser,
    setAuthStateListener,
    
    // Core Functions
    getInventory,
    saveInventory,
    addProduct,
    updateProduct,
    deleteProduct,
    getAvailableCatalog,
    registerSale,
    registerQuote,
    
    getClients,
    addClient,
    updateClient,
    deleteClient,
    
    getBudgets,
    saveBudgets,
    addBudget,
    updateBudgetStatus,
    deleteBudget,
    getNextBudgetNumber,
    
    getDashboardStats
};

// Carregar cache local inicialmente para nÃ£o dar erro no boot
loadFromLocalStorage();
