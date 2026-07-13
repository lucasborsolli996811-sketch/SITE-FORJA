/* ==========================================
   FORJA — Cloud Database (Google Sheets & Local Storage Fallback)
   ========================================== */

// CONFIGURAÇÃO DO BANCO DE DADOS EM NUVEM
// Cole aqui a URL do seu Web App gerado no Google Apps Script:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXig8B36L78x89KCiN_0Y50qJ7cxnBQRd_PfTyLgxN6rcOHgO1yb3keR4c0kWULHu4/exec";

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

const defaultInventory = [
    {
        id: 'deskar-1',
        brand: 'DESKAR',
        name: 'Ferramenta de Corte Torno CNC',
        desc: 'Suporte para pastilha com excelente estabilidade e precisão de corte.',
        stock: 5,
        img: '',
        buyLink: 'https://exemplo.com/comprar-cnc',
        buyPrice: 50.00,
        sellPrice: 120.00,
        soldCount: 8,
        quotedCount: 15
    },
    {
        id: 'deskar-2',
        brand: 'DESKAR',
        name: 'Pastilha de Torneamento TNMG',
        desc: 'Caixa com 10 pastilhas de alta durabilidade para desbaste e acabamento.',
        stock: 12,
        img: '',
        buyLink: 'https://exemplo.com/comprar-tnmg',
        buyPrice: 35.00,
        sellPrice: 85.00,
        soldCount: 20,
        quotedCount: 32
    },
    {
        id: 'deskar-3',
        brand: 'DESKAR',
        name: 'Broca de Metal Duro Integral',
        desc: 'Furação de alta performance com cobertura avançada para maior vida útil.',
        stock: 0,
        img: '',
        buyLink: 'https://exemplo.com/comprar-broca',
        buyPrice: 80.00,
        sellPrice: 190.00,
        soldCount: 3,
        quotedCount: 8
    }
];

const defaultClients = [
    {
        id: 'client-1',
        name: 'STEMA USINAGEM E SOLDA',
        address: 'Rua das Indústrias, 450 - Bauru/SP',
        email: 'contato@stema.com.br',
        phone: '(14) 99777-8888'
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
                total: 452.00
            }
        ],
        observations: '',
        status: 'PRODUTO COMPRADO',
        totalValue: 452.00
    }
];

// --- Carregar banco da Planilha ou LocalStorage (Fallback) ---
async function syncLoad() {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("URL_DO_GOOGLE_SCRIPT")) {
        console.log("Usando banco local (localStorage) - URL do Google Apps Script não configurada.");
        loadFromLocalStorage();
        return;
    }
    
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL);
        const data = await res.json();
        if (data && !data.error) {
            cachedData.inventory = data.inventory || [];
            cachedData.clients = data.clients || [];
            cachedData.budgets = data.budgets || [];
            cachedData.lastBudgetNum = parseInt(data.lastBudgetNum) || 12001;
            console.log("Banco de dados sincronizado com o Google Sheets com sucesso.");
            // Salva backup local
            saveToLocalStorage();
        } else {
            throw new Error(data.error || "Erro retornado do Apps Script");
        }
    } catch (err) {
        console.warn("Erro ao sincronizar com Google Sheets, usando backup local:", err);
        loadFromLocalStorage();
    }
}

// --- Salvar alterações na Planilha e no LocalStorage ---
async function syncSave() {
    // Backup local imediato
    saveToLocalStorage();

    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("URL_DO_GOOGLE_SCRIPT")) {
        return;
    }

    try {
        const body = {
            action: "saveAll",
            data: {
                inventory: cachedData.inventory,
                clients: cachedData.clients,
                budgets: cachedData.budgets,
                lastBudgetNum: cachedData.lastBudgetNum
            }
        };
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.success) {
            console.log("Mudanças salvas no Google Sheets com sucesso.");
        } else {
            console.error("Falha ao salvar mudanças no Google Sheets:", result.error);
        }
    } catch (err) {
        console.error("Erro de rede ao salvar no Google Sheets:", err);
    }
}

function loadFromLocalStorage() {
    cachedData.inventory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cachedData.clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    cachedData.budgets = JSON.parse(localStorage.getItem(BUDGETS_KEY) || '[]');
    cachedData.lastBudgetNum = parseInt(localStorage.getItem(LAST_NUM_KEY) || '12001');

    if (cachedData.inventory.length === 0) {
        cachedData.inventory = defaultInventory;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultInventory));
    }
    if (cachedData.clients.length === 0) {
        cachedData.clients = defaultClients;
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(defaultClients));
    }
    if (cachedData.budgets.length === 0) {
        cachedData.budgets = defaultBudgets;
        localStorage.setItem(BUDGETS_KEY, JSON.stringify(defaultBudgets));
    }
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
    syncSave();
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
}

function updateProduct(id, updatedFields) {
    const inventory = getInventory();
    const index = inventory.findIndex(p => p.id === id);
    if (index !== -1) {
        inventory[index] = { ...inventory[index], ...updatedFields };
        saveInventory(inventory);
    }
}

function deleteProduct(id) {
    let inventory = getInventory();
    inventory = inventory.filter(p => p.id !== id);
    saveInventory(inventory);
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
    }
}

// === CLIENT OPERATIONS ===
function getClients() {
    return cachedData.clients;
}

function saveClients(clients) {
    cachedData.clients = clients;
    syncSave();
}

function addClient(client) {
    const clients = getClients();
    client.id = `client-${Date.now()}`;
    clients.push(client);
    saveClients(clients);
    return client;
}

function deleteClient(id) {
    let clients = getClients();
    clients = clients.filter(c => c.id !== id);
    saveClients(clients);
}

function updateClient(id, updatedFields) {
    const clients = getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
        clients[index] = { ...clients[index], ...updatedFields };
        saveClients(clients);
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
    syncSave();
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
    return budget.number;
}

function updateBudgetStatus(number, status) {
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.number === parseInt(number));
    if (index !== -1) {
        budgets[index].status = status;
        saveBudgets(budgets);
        return true;
    }
    return false;
}

function deleteBudget(number) {
    let budgets = getBudgets();
    budgets = budgets.filter(b => b.number !== parseInt(number));
    saveBudgets(budgets);
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
    syncLoad,
    syncSave,
    
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

// Carregar cache local de forma síncrona inicialmente como redundância
loadFromLocalStorage();
