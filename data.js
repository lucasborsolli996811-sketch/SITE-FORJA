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

// Detectar se está rodando em ambiente local (localhost / arquivo local)
const isLocalEnv = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:'
);

// Initialize Firebase (apenas se NÃO estiver em ambiente local de testes/desenvolvimento)
if (!isLocalEnv && typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}
const db = (!isLocalEnv && typeof firebase !== 'undefined') ? firebase.firestore() : null;
const auth = (!isLocalEnv && typeof firebase !== 'undefined') ? firebase.auth() : null;

if (isLocalEnv) {
    console.info("🛡️ FORJA DEV: Modo Localhost / Offline ativado. As alterações NÃO afetam o site ou o banco de dados online.");
}

const STORAGE_KEY = 'forja_inventory';
const CLIENTS_KEY = 'forja_clients';
const BUDGETS_KEY = 'forja_budgets';
const LAST_NUM_KEY = 'forja_last_budget_num';
const POSTS_KEY = 'forja_posts';
const RAW_MATERIALS_KEY = 'forja_raw_materials_3d';
const CONSUMABLES_KEY = 'forja_consumables_3d';

// Dados Padrão de Orçamentos e Clientes Realizados
const defaultClients = [
    {
        id: 'client-1',
        name: 'STEMA USINAGEM E SOLDA',
        address: 'Rua das Indústrias, 450 - Bauru/SP',
        email: 'contato@stema.com.br',
        phone: '(14) 99777-8888'
    },
    {
        id: 'client-1784044878255',
        name: 'Stema Usinagem e Solda',
        address: 'Av. Joaquim Ferraz de Almeida Prado, 1585',
        email: 'stema@stemausinagem.com.br',
        phone: '( 14 ) 99145-4938'
    }
];

const defaultBudgets = [
    {
        number: 12001,
        clientId: 'client-1',
        clientName: 'STEMA USINAGEM E SOLDA',
        date: '2026-07-01',
        deliveryDate: 'Entre 10/07 a 20/07',
        itens: [
            {
                service: 'SPMX07T308 YG02',
                type: 'tools',
                value: 45.20,
                qty: 10,
                total: 452.00,
                faturadoQty: 10
            }
        ],
        observations: '',
        status: 'PRODUTO FATURADO',
        totalValue: 452.00,
        stockDeducted: true,
        vendedor: 'Lucas',
        validadeDate: '7 dias',
        paymentCond: 'A combinar',
        frete: 0
    },
    {
        number: 12005,
        clientId: 'client-1784044878255',
        clientName: 'Stema Usinagem e Solda',
        date: '2026-06-29',
        deliveryDate: 'Entre 10/07 a 20/07',
        itens: [
            {
                service: 'Bedame 3mm (Deskar)',
                details: 'TDC300',
                type: 'tools',
                value: 580.00,
                qty: 1,
                total: 580.00,
                productId: 'deskar-1784044750684',
                faturadoQty: 0
            }
        ],
        observations: 'Pedido entregue.',
        status: 'EM ABERTO',
        totalValue: 580.00,
        stockDeducted: false,
        vendedor: 'Lucas',
        validadeDate: '7 dias',
        paymentCond: 'A combinar',
        frete: 0
    }
];

// Cache em Memória
let cachedData = {
    inventory: [],
    clients: [],
    budgets: [],
    posts: [],
    rawMaterials: [],
    consumables3d: [],
    lastBudgetNum: 12005
};

// Auth listener callback
let onAuthStateChangeCallback = null;

if (auth) {
    auth.onAuthStateChanged((user) => {
        if (onAuthStateChangeCallback) {
            onAuthStateChangeCallback(user);
        }
    });
} else if (isLocalEnv) {
    // Em localhost / desenvolvimento offline, inicializar sessão local imediata
    setTimeout(() => {
        const localSession = localStorage.getItem('forja_local_admin_session') === 'true';
        if (onAuthStateChangeCallback && localSession) {
            onAuthStateChangeCallback({ email: 'admin@forja.local', uid: 'local-admin' });
        }
    }, 10);
}

// --- Authentication Operations ---
function loginAdmin(email, password) {
    if (isLocalEnv) {
        // Autenticação local offline
        localStorage.setItem('forja_local_admin_session', 'true');
        const mockUser = { email: email || 'admin@forja.local', uid: 'local-admin' };
        if (onAuthStateChangeCallback) {
            onAuthStateChangeCallback(mockUser);
        }
        return Promise.resolve(mockUser);
    }
    if (!auth) return Promise.reject("Firebase Auth não carregado.");
    return auth.signInWithEmailAndPassword(email, password);
}

function logoutAdmin() {
    if (isLocalEnv) {
        localStorage.removeItem('forja_local_admin_session');
        if (onAuthStateChangeCallback) {
            onAuthStateChangeCallback(null);
        }
        return Promise.resolve();
    }
    if (!auth) return Promise.resolve();
    return auth.signOut();
}

function getCurrentUser() {
    if (isLocalEnv) {
        return localStorage.getItem('forja_local_admin_session') === 'true'
            ? { email: 'admin@forja.local', uid: 'local-admin' }
            : null;
    }
    return auth ? auth.currentUser : null;
}

function setAuthStateListener(cb) {
    onAuthStateChangeCallback = cb;
    if (isLocalEnv) {
        const localSession = localStorage.getItem('forja_local_admin_session') === 'true';
        if (localSession) {
            setTimeout(() => {
                cb({ email: 'admin@forja.local', uid: 'local-admin' });
            }, 0);
        }
    }
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
        if (!isLocalEnv) {
            console.warn("Firebase não inicializado. Usando banco local (localStorage).");
            alert("Erro Crítico: Os scripts do Firebase não carregaram. Verifique a internet ou bloqueadores de anúncios.");
        } else {
            console.log("Modo Offline Localhost ativo: carregando dados locais do localStorage instantaneamente.");
        }
        loadFromLocalStorage();
        return Promise.resolve();
    }
    
    // Check if logged in first to avoid permission denied
    if (!getCurrentUser()) {
        console.error("Usuário não autenticado. Acesso negado às coleções privadas.");
        return Promise.reject("Não autenticado");
    }

    try {
        // Carregamento paralelo simultâneo ultra-rápido de todas as coleções
        const [invSnap, cliSnap, budSnap, postsSnap, rawSnap, confSnap] = await Promise.all([
            db.collection('inventory').get(),
            db.collection('clients').get(),
            db.collection('budgets').get(),
            db.collection('posts').get(),
            db.collection('raw_materials_3d').get(),
            db.collection('config').doc('main').get()
        ]);

        let isEmpty = true;

        if (!invSnap.empty) {
            cachedData.inventory = invSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        if (!cliSnap.empty) {
            cachedData.clients = cliSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        if (!budSnap.empty) {
            cachedData.budgets = budSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        if (!postsSnap.empty) {
            cachedData.posts = postsSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        if (!rawSnap.empty) {
            cachedData.rawMaterials = rawSnap.docs.map(d => d.data());
            isEmpty = false;
        }

        if (confSnap.exists) {
            cachedData.lastBudgetNum = confSnap.data().lastBudgetNum || 12005;
        }

        let budgetsUpdated = false; // Kept to avoid syntax errors below if it's referenced

        if (budgetsUpdated) {
            cachedData.lastBudgetNum = Math.max(cachedData.lastBudgetNum || 12001, 12005);
            if (db && getCurrentUser()) {
                db.collection('config').doc('main').set({ lastBudgetNum: cachedData.lastBudgetNum }).catch(console.error);
            }
        }

        if (isEmpty) {
            console.log("Firebase está vazio. Migrando dados do LocalStorage para a nuvem...");
            loadFromLocalStorage(); // Carrega o que já existia no PC dele
            syncSave(); // Força o envio (upload) de tudo pro Firebase
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
    cachedData.posts.forEach(p => {
        db.collection('posts').doc(p.id).set(p);
    });
    cachedData.rawMaterials.forEach(rm => {
        db.collection('raw_materials_3d').doc(rm.id).set(rm);
    });
    db.collection('config').doc('main').set({ lastBudgetNum: cachedData.lastBudgetNum });
}

function loadFromLocalStorage() {
    const rawBudgets = localStorage.getItem(BUDGETS_KEY);
    const rawClients = localStorage.getItem(CLIENTS_KEY);

    cachedData.inventory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cachedData.clients = JSON.parse(rawClients || '[]');
    cachedData.budgets = JSON.parse(rawBudgets || '[]');
    cachedData.posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
    cachedData.rawMaterials = JSON.parse(localStorage.getItem(RAW_MATERIALS_KEY) || '[]');
    cachedData.consumables3d = JSON.parse(localStorage.getItem(CONSUMABLES_KEY) || '[]');
    cachedData.lastBudgetNum = parseInt(localStorage.getItem(LAST_NUM_KEY) || '12005');

    let hasNew = false;
    if (!rawBudgets) {
        defaultBudgets.forEach(dbud => {
            if (!cachedData.budgets.some(b => b.number === dbud.number)) {
                cachedData.budgets.push(JSON.parse(JSON.stringify(dbud)));
                hasNew = true;
            }
        });
    }
    if (!rawClients) {
        defaultClients.forEach(dc => {
            if (!cachedData.clients.some(c => c.id === dc.id || (c.name && c.name.toUpperCase() === dc.name.toUpperCase()))) {
                cachedData.clients.push(JSON.parse(JSON.stringify(dc)));
                hasNew = true;
            }
        });
    }

    cachedData.lastBudgetNum = Math.max(cachedData.lastBudgetNum || 12001, 12005);
    if (hasNew) {
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData.inventory));
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(cachedData.clients));
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(cachedData.budgets));
    localStorage.setItem(POSTS_KEY, JSON.stringify(cachedData.posts));
    localStorage.setItem(RAW_MATERIALS_KEY, JSON.stringify(cachedData.rawMaterials));
    localStorage.setItem(CONSUMABLES_KEY, JSON.stringify(cachedData.consumables3d));
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
    if (db && getCurrentUser()) db.collection('inventory').doc(id).delete().catch(e => alert('Erro Firebase: ' + e.message));
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
        // Deduz do estoque disponível (até 0)
        const deductFromStock = Math.min(qty, p.stock);
        p.stock = Math.max(0, p.stock - deductFromStock);
        // SoldCount SEMPRE incrementa pelo total da venda (para manter o histórico de despesas correto)
        p.soldCount = (p.soldCount || 0) + qty;
        saveInventory(inventory);
        if (db && getCurrentUser()) {
            db.collection('inventory').doc(id).update({
                stock: p.stock,
                soldCount: p.soldCount
            });
        }
        return true;
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
    if (db && getCurrentUser()) db.collection('clients').doc(id).delete().catch(e => alert('Erro Firebase: ' + e.message));
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

function updateBudgetFull(number, updatedFields) {
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.number === parseInt(number));
    if (index !== -1) {
        budgets[index] = { ...budgets[index], ...updatedFields };
        saveBudgets(budgets);
        if (db && getCurrentUser()) db.collection('budgets').doc(number.toString()).update(updatedFields);
        return true;
    }
    return false;
}


function deleteBudget(number) {
    let budgets = getBudgets();
    budgets = budgets.filter(b => b.number !== parseInt(number));
    saveBudgets(budgets);
    if (db && getCurrentUser()) db.collection('budgets').doc(number.toString()).delete().catch(e => alert('Erro Firebase: ' + e.message));
}

// Registra uma venda direta (sem orçamento formal) como um registro faturado
function addDirectSale({ productId, productName, qty, sellPrice, buyPrice }) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');

    const budget = {
        clientName: 'VENDA DIRETA',
        clientId: null,
        date: dateStr,
        status: 'PRODUTO FATURADO',
        statusDate: now.toISOString(),
        stockDeducted: true,
        directSale: true,
        frete: 0,
        obs: '',
        payment: [],
        validade: '',
        prazo: '',
        itens: [
            {
                type: 'tools',
                productId: productId,
                name: productName,
                qty: qty,
                faturadoQty: qty,
                value: sellPrice,
                isBox: false
            }
        ]
    };

    const num = addBudget(budget);
    console.log('[VENDA DIRETA] Orçamento criado:', num, '| Orçamentos totais:', cachedData.budgets.length);
    console.log('[VENDA DIRETA] Último orçamento:', cachedData.budgets[cachedData.budgets.length - 1]);
    return num;
}

// === POSTS (CMS) OPERATIONS ===
function getPosts() {
    return cachedData.posts || [];
}

function savePosts(posts) {
    cachedData.posts = posts;
    saveToLocalStorage();
}

function addPost(post) {
    const posts = getPosts();
    post.id = `post-${Date.now()}`;
    post.createdAt = new Date().toISOString();
    posts.push(post);
    savePosts(posts);
    if (db && getCurrentUser()) db.collection('posts').doc(post.id).set(post);
    return post;
}

function updatePost(id, updatedFields) {
    const posts = getPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index !== -1) {
        posts[index] = { ...posts[index], ...updatedFields };
        savePosts(posts);
        if (db && getCurrentUser()) db.collection('posts').doc(id).update(updatedFields);
        return true;
    }
    return false;
}

function deletePost(id) {
    let posts = getPosts();
    posts = posts.filter(p => p.id !== id);
    savePosts(posts);
    if (db && getCurrentUser()) db.collection('posts').doc(id).delete().catch(e => alert('Erro Firebase: ' + e.message));
}

// === RAW MATERIALS 3D (MP IMPRESSÃO 3D) OPERATIONS ===
function getRawMaterials3D() {
    const list = cachedData.rawMaterials || [];
    // Auto-migração para gramas (se o usuário informou 1kg vira 1000g)
    list.forEach(m => {
        if (m.stockGrams === undefined) {
            const kg = parseFloat(m.stockKg) || 0;
            m.stockGrams = kg >= 50 ? kg : Math.round(kg * 1000);
            m.stockKg = m.stockGrams / 1000;
        }
    });
    return list;
}

function saveRawMaterials3D(materials) {
    cachedData.rawMaterials = materials;
    saveToLocalStorage();
}

function addRawMaterial3D(material) {
    const materials = getRawMaterials3D();
    material.id = `mp3d-${Date.now()}`;
    material.createdAt = new Date().toISOString();
    material.pricePerKg = parseFloat(material.pricePerKg) || 0;
    
    // Converte para gramas: 1kg = 1000g
    let grams = 0;
    if (material.stockGrams !== undefined) {
        grams = parseFloat(material.stockGrams) || 0;
    } else if (material.stockKg !== undefined) {
        const val = parseFloat(material.stockKg) || 0;
        grams = val >= 50 ? val : Math.round(val * 1000);
    }
    material.stockGrams = grams;
    material.stockKg = grams / 1000;

    material.color = (material.color || '').trim();
    material.buyLink = (material.buyLink || '').trim();
    materials.push(material);
    saveRawMaterials3D(materials);
    if (db && getCurrentUser()) {
        db.collection('raw_materials_3d').doc(material.id).set(material).catch(console.error);
    }
    return material;
}

function updateRawMaterial3D(id, updatedFields) {
    const materials = getRawMaterials3D();
    const index = materials.findIndex(m => m.id === id);
    if (index !== -1) {
        if (updatedFields.pricePerKg !== undefined) {
            updatedFields.pricePerKg = parseFloat(updatedFields.pricePerKg) || 0;
        }
        if (updatedFields.stockGrams !== undefined) {
            const grams = parseFloat(updatedFields.stockGrams) || 0;
            updatedFields.stockGrams = grams;
            updatedFields.stockKg = grams / 1000;
        } else if (updatedFields.stockKg !== undefined) {
            const val = parseFloat(updatedFields.stockKg) || 0;
            const grams = val >= 50 ? val : Math.round(val * 1000);
            updatedFields.stockGrams = grams;
            updatedFields.stockKg = grams / 1000;
        }
        materials[index] = { ...materials[index], ...updatedFields };
        saveRawMaterials3D(materials);
        if (db && getCurrentUser()) {
            db.collection('raw_materials_3d').doc(id).update(updatedFields).catch(console.error);
        }
        return true;
    }
    return false;
}

function deleteRawMaterial3D(id) {
    let materials = getRawMaterials3D();
    materials = materials.filter(m => m.id !== id);
    saveRawMaterials3D(materials);
    if (db && getCurrentUser()) {
        db.collection('raw_materials_3d').doc(id).delete().catch(console.error);
    }
}

// === DASHBOARD STATISTICS ===

// === CONSUMABLES 3D OPERATIONS ===
function getConsumables3d() {
    return cachedData.consumables3d || [];
}

function saveConsumables3d(consumables) {
    cachedData.consumables3d = consumables;
    saveToLocalStorage();
}

function addConsumable3d(c) {
    const list = getConsumables3d();
    c.id = 'cons3d-' + Date.now();
    c.createdAt = new Date().toISOString();
    list.push(c);
    saveConsumables3d(list);
    if (db && getCurrentUser()) {
        db.collection('consumables_3d').doc(c.id).set(c).catch(console.error);
    }
    return c;
}

function deleteConsumable3d(id) {
    let list = getConsumables3d();
    list = list.filter(c => c.id !== id);
    saveConsumables3d(list);
    if (db && getCurrentUser()) {
        db.collection('consumables_3d').doc(id).delete().catch(console.error);
    }
}

function updateConsumable3d(id, newData) {
    let list = getConsumables3d();
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], ...newData };
        saveConsumables3d(list);
        if (db && getCurrentUser()) {
            db.collection('consumables_3d').doc(id).update(newData).catch(console.error);
        }
    }
}
function getDashboardStats() {
    const inventory = getInventory();
    
    let totalSpent = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalStockPotential = 0; // Valor de venda de todo o estoque atual
    
    inventory.forEach(p => {
        const buy = parseFloat(p.buyPrice) || 0;
        const sell = parseFloat(p.sellPrice) || 0;
        const stock = parseInt(p.stock) || 0;
        const sold = parseInt(p.soldCount) || 0;
        
        // Gasto em compras is the total value of all stock purchased (sold + in stock)
        totalSpent += (stock + sold) * buy;

        // Valor potencial: se vender tudo que tem em estoque agora
        totalStockPotential += stock * sell;
    });

    // Somar valor da matéria-prima de impressão 3D (filamento/resina) em gramas ao gasto de estoque
    const rawMaterials = getRawMaterials3D();
    rawMaterials.forEach(rm => {
        const price = parseFloat(rm.pricePerKg) || 0;
        const grams = parseFloat(rm.stockGrams) || 0;
        totalSpent += (grams / 1000) * price;
    });
    
        // Somar consumos (impressão 3D e outros gastos avulsos)
    const consumables = getConsumables3d();
    consumables.forEach(c => {
        const qty = parseFloat(c.qty) || 0;
        const price = parseFloat(c.price) || 0;
        totalSpent += qty * price;
    });
    
    // Revenue and Profit are calculated purely from actual billed budgets
    const budgets = getBudgets();
    console.log('[getDashboardStats] Total orçamentos:', budgets.length, '| FATURADO:', budgets.filter(b => b.status === 'PRODUTO FATURADO').length);
    budgets.forEach(b => {
        if (b.status === 'PRODUTO FATURADO' || b.status === 'FATURAMENTO PARCIAL') {
            (b.itens || []).forEach(item => {
                let billed = item.faturadoQty !== undefined ? item.faturadoQty : (b.status === 'PRODUTO FATURADO' ? item.qty : 0);
                
                if (billed > 0) {
                    const itemRevenue = billed * (parseFloat(item.value) || 0);
                    console.log('[getDashboardStats] Orç#' + b.number + ' item:', item.name, '| billed:', billed, '| value:', item.value, '| revenue:', itemRevenue);
                    totalRevenue += itemRevenue;
                    
                    if (item.type === 'tools' && item.productId) {
                        const product = inventory.find(p => p.id === item.productId);
                        let cost = 0;
                        if (product) {
                            const buyPrice = parseFloat(product.buyPrice) || 0;
                            let requiredStock = billed;
                            if (!item.isBox && product.isBox && item.qty >= 10 && item.qty % 10 === 0) {
                                requiredStock = billed / 10;
                            }
                            cost = requiredStock * buyPrice;
                        }
                        totalProfit += (itemRevenue - cost);
                    } else {
                        // Services and 3D Prints have no inventory cost basis
                        totalProfit += itemRevenue;
                    }
                }
            });
        }
    });
    console.log('[getDashboardStats] totalRevenue FINAL:', totalRevenue);

    
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
        totalStockPotential,
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
    updateBudgetFull,
    deleteBudget,
    getNextBudgetNumber,
    addDirectSale,
    
    getPosts,
    addPost,
    updatePost,
    deletePost,
    
    getRawMaterials3D,
    addRawMaterial3D,
    updateRawMaterial3D,
    deleteRawMaterial3D,
    getConsumables3d,
    addConsumable3d,
    updateConsumable3d,
    deleteConsumable3d,
    
    getDashboardStats
};

// Carregar cache local inicialmente para nÃ£o dar erro no boot
loadFromLocalStorage();















