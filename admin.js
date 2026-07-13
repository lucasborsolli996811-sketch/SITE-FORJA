/* ==========================================
   FORJA — Admin Console Script
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let budgetItens = [];
    let activeBudgetId = null; // To keep track if we are editing/viewing an existing budget
    let editingClientId = null; // To keep track if we are editing an existing client

    // --- Authentication State ---
    const checkAuth = () => {
        const loggedIn = sessionStorage.getItem('forja_admin_logged');
        const loggedOutView = document.getElementById('sidebar-logged-out-view');
        const loggedInView = document.getElementById('sidebar-logged-in-view');

        if (loggedIn === 'true') {
            document.body.classList.add('logged-in-admin');
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('dashboard-view').style.display = 'block';
            
            // Show PDF preview in sidebar
            if (loggedOutView) loggedOutView.style.display = 'none';
            if (loggedInView) loggedInView.style.display = 'block';
            
            // Render dashboard data
            renderDashboard();
            loadClientsSelects();
            loadToolsSelect();
            initBudgetGenerator();
        } else {
            document.body.classList.remove('logged-in-admin');
            document.getElementById('login-view').style.display = 'block';
            document.getElementById('dashboard-view').style.display = 'none';
            
            // Show default giant logo in sidebar
            if (loggedOutView) loggedOutView.style.display = 'block';
            if (loggedInView) loggedInView.style.display = 'none';
        }
    };

    // --- Login Form ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value.trim();

            if (user === 'Lucas Borsolli' && pass === '811628') {
                sessionStorage.setItem('forja_admin_logged', 'true');
                loginError.style.display = 'none';
                loginForm.reset();
                checkAuth();
            } else {
                loginError.textContent = "Usuário ou senha incorretos!";
                loginError.style.display = 'block';
            }
        });
    }

    // --- Logout ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('forja_admin_logged');
            checkAuth();
        });
    }

    // --- Tab Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) targetEl.classList.add('active');

            // Refresh data on tab switches
            if (targetTab === 'tab-estoque') {
                renderDashboard();
            } else if (targetTab === 'tab-clientes') {
                renderClientsTable();
            } else if (targetTab === 'tab-historico') {
                renderBudgetsHistory();
            } else if (targetTab === 'tab-gerador') {
                loadClientsSelects();
                loadToolsSelect();
            }
        });
    });

    // --- Render Entire Dashboard (Metrics & Inventory) ---
    const renderDashboard = () => {
        renderMetrics();
        renderTopLists();
        renderInventoryTable();
    };

    const renderMetrics = () => {
        const stats = window.ForjaDB.getDashboardStats();
        const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const metricSpent = document.getElementById('metric-spent');
        const metricRevenue = document.getElementById('metric-revenue');
        const metricProfit = document.getElementById('metric-profit');

        if (metricSpent) metricSpent.textContent = formatBRL(stats.totalSpent);
        if (metricRevenue) metricRevenue.textContent = formatBRL(stats.totalRevenue);
        if (metricProfit) metricProfit.textContent = formatBRL(stats.totalProfit);
    };

    const renderTopLists = () => {
        const stats = window.ForjaDB.getDashboardStats();
        const topSoldContainer = document.getElementById('top-sold-list');
        const topQuotedContainer = document.getElementById('top-quoted-list');

        if (topSoldContainer) {
            if (stats.topSold.length === 0) {
                topSoldContainer.innerHTML = `<tr><td colspan="2" style="color:var(--text-muted); font-size:0.85rem; padding:1rem 0;">Nenhuma venda registrada ainda.</td></tr>`;
            } else {
                topSoldContainer.innerHTML = stats.topSold.map(p => `
                    <tr>
                        <td><strong>${p.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${p.brand})</span></td>
                        <td style="text-align:right; font-weight:bold; color:var(--accent-light);">${p.soldCount} un.</td>
                    </tr>
                `).join('');
            }
        }

        if (topQuotedContainer) {
            if (stats.topQuoted.length === 0) {
                topQuotedContainer.innerHTML = `<tr><td colspan="2" style="color:var(--text-muted); font-size:0.85rem; padding:1rem 0;">Nenhum clique de orçamento registrado.</td></tr>`;
            } else {
                topQuotedContainer.innerHTML = stats.topQuoted.map(p => `
                    <tr>
                        <td><strong>${p.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${p.brand})</span></td>
                        <td style="text-align:right; font-weight:bold; color:var(--accent);">${p.quotedCount} cliq.</td>
                    </tr>
                `).join('');
            }
        }
    };

    const tbody = document.getElementById('inventory-list-tbody');
    const renderInventoryTable = () => {
        if (!tbody) return;
        const inventory = window.ForjaDB.getInventory();

        if (inventory.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding: 2rem;">Nenhum produto cadastrado no estoque.</td></tr>`;
            return;
        }

        tbody.innerHTML = inventory.map(p => `
            <tr data-id="${p.id}">
                <td><span class="badge-brand">${p.brand}</span></td>
                <td>
                    <strong>${p.name}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                        Custo: R$ ${(p.buyPrice || 0).toFixed(2)} | Venda: R$ ${(p.sellPrice || 0).toFixed(2)}
                        ${p.buyLink ? ` | <a href="${p.buyLink}" target="_blank" style="color:var(--accent-light); text-decoration:underline;">Link de Compra</a>` : ''}
                    </div>
                </td>
                <td style="text-align:center;">
                    <div class="table-qty-control">
                        <button class="table-qty-btn stock-minus" data-id="${p.id}"><i class="fa-solid fa-minus"></i></button>
                        <span class="stock-display" data-id="${p.id}">${p.stock}</span>
                        <button class="table-qty-btn stock-plus" data-id="${p.id}"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="sell-prod-btn" data-id="${p.id}" title="Registrar Venda" style="background:none; border:none; color:#25d366; cursor:pointer; font-size:1.05rem; padding:0.5rem; margin-right:0.25rem;">
                        <i class="fa-solid fa-cart-shopping"></i> Vender
                    </button>
                    <button class="delete-prod-btn" data-id="${p.id}" title="Excluir" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.05rem; padding:0.5rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        attachTableEvents();
    };

    const attachTableEvents = () => {
        document.querySelectorAll('.stock-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const display = document.querySelector(`.stock-display[data-id="${id}"]`);
                if (display) {
                    let stock = parseInt(display.textContent) || 0;
                    stock++;
                    display.textContent = stock;
                    window.ForjaDB.updateProduct(id, { stock });
                    renderMetrics();
                }
            });
        });

        document.querySelectorAll('.stock-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const display = document.querySelector(`.stock-display[data-id="${id}"]`);
                if (display) {
                    let stock = parseInt(display.textContent) || 0;
                    if (stock > 0) {
                        stock--;
                        display.textContent = stock;
                        window.ForjaDB.updateProduct(id, { stock });
                        renderMetrics();
                    }
                }
            });
        });

        document.querySelectorAll('.sell-prod-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const qtyStr = prompt("Digite a quantidade vendida:");
                if (qtyStr === null) return;
                
                const qty = parseInt(qtyStr) || 0;
                if (qty <= 0) {
                    alert("Quantidade inválida!");
                    return;
                }

                const success = window.ForjaDB.registerSale(id, qty);
                if (success) {
                    alert("Venda registrada com sucesso!");
                    renderDashboard();
                } else {
                    alert("Estoque insuficiente para registrar esta venda!");
                }
            });
        });

        document.querySelectorAll('.delete-prod-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm("Deseja realmente excluir este produto?")) {
                    window.ForjaDB.deleteProduct(id);
                    renderDashboard();
                }
            });
        });
    };

    // Form Cadastro Ferramenta
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const brand = document.getElementById('prod-brand').value.trim();
            const name = document.getElementById('prod-name').value.trim();
            const desc = document.getElementById('prod-desc').value.trim();
            const stock = parseInt(document.getElementById('prod-stock').value) || 0;
            const buyLink = document.getElementById('prod-buy-link').value.trim();
            const buyPrice = parseFloat(document.getElementById('prod-buy-price').value) || 0;
            const sellPrice = parseFloat(document.getElementById('prod-sell-price').value) || 0;
            const img = document.getElementById('prod-img').value.trim();

            const newProduct = { brand, name, desc, stock, buyLink, buyPrice, sellPrice, img };
            window.ForjaDB.addProduct(newProduct);
            addProductForm.reset();
            renderDashboard();
            alert("Ferramenta cadastrada com sucesso!");
        });
    }


    // ==========================================
    // CLIENTS MANAGEMENT
    // ==========================================
    const addClientForm = document.getElementById('add-client-form');
    const clientsTbody = document.getElementById('clients-list-tbody');

    const submitBtn = document.getElementById('client-submit-btn');
    const cancelBtn = document.getElementById('client-cancel-edit-btn');

    const resetClientFormState = () => {
        if (addClientForm) addClientForm.reset();
        editingClientId = null;
        if (submitBtn) {
            submitBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>Cadastrar Cliente</span>`;
        }
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    };

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetClientFormState();
        });
    }

    const renderClientsTable = () => {
        if (!clientsTbody) return;
        const clients = window.ForjaDB.getClients();

        if (clients.length === 0) {
            clientsTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding: 2rem;">Nenhum cliente cadastrado.</td></tr>`;
            return;
        }

        clientsTbody.innerHTML = clients.map(c => `
            <tr data-id="${c.id}">
                <td>
                    <strong>${c.name}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">${c.address}</div>
                </td>
                <td>
                    <div style="font-size:0.85rem;">${c.phone}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${c.email}</div>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="edit-client-btn" data-id="${c.id}" title="Editar Cliente" style="background:none; border:none; color:var(--accent-light); cursor:pointer; font-size:1.05rem; padding:0.5rem; margin-right:0.25rem;">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="delete-client-btn" data-id="${c.id}" title="Excluir Cliente" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.05rem; padding:0.5rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach edit events
        document.querySelectorAll('.edit-client-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const client = clients.find(c => c.id === id);
                if (client) {
                    editingClientId = id;
                    document.getElementById('client-name-input').value = client.name;
                    document.getElementById('client-address-input').value = client.address;
                    document.getElementById('client-email-input').value = client.email;
                    document.getElementById('client-phone-input').value = client.phone;
                    
                    if (submitBtn) {
                        submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Salvar Alterações</span>`;
                    }
                    if (cancelBtn) {
                        cancelBtn.style.display = 'block';
                    }
                    
                    // Scroll to form on small screens
                    document.getElementById('client-name-input').focus();
                }
            });
        });

        // Attach delete events
        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm("Deseja realmente excluir este cliente? Isso não afetará orçamentos já salvos.")) {
                    if (editingClientId === id) {
                        resetClientFormState();
                    }
                    window.ForjaDB.deleteClient(id);
                    renderClientsTable();
                    loadClientsSelects();
                }
            });
        });
    };

    if (addClientForm) {
        addClientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('client-name-input').value.trim();
            const address = document.getElementById('client-address-input').value.trim();
            const email = document.getElementById('client-email-input').value.trim();
            const phone = document.getElementById('client-phone-input').value.trim();

            if (editingClientId) {
                window.ForjaDB.updateClient(editingClientId, { name, address, email, phone });
                alert("Cadastro do cliente atualizado com sucesso!");
                resetClientFormState();
            } else {
                window.ForjaDB.addClient({ name, address, email, phone });
                alert("Cliente cadastrado com sucesso!");
                addClientForm.reset();
            }

            renderClientsTable();
            loadClientsSelects();
        });
    }

    const loadClientsSelects = () => {
        const select = document.getElementById('budget-client-select');
        if (!select) return;
        
        const clients = window.ForjaDB.getClients();
        const selectedVal = select.value;
        
        select.innerHTML = `<option value="" disabled selected>Selecione um cliente...</option>` +
            clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
        if (selectedVal) select.value = selectedVal;
    };


    // ==========================================
    // BUDGET GENERATOR & LIVE PREVIEW
    // ==========================================
    const budgetMetaForm = document.getElementById('budget-meta-form');
    const addItemForm = document.getElementById('add-item-budget-form');
    
    // Sync UI to PDF preview
    const updatePDFPreview = () => {
        // Metadata Sync
        const clientSelect = document.getElementById('budget-client-select');
        const pdfClientName = document.getElementById('pdf-client-name');
        if (clientSelect && pdfClientName) {
            const clients = window.ForjaDB.getClients();
            const client = clients.find(c => c.id === clientSelect.value);
            pdfClientName.textContent = client ? client.name : "NENHUM SELECIONADO";
        }

        const dateInput = document.getElementById('budget-date-input');
        const pdfDate = document.getElementById('pdf-budget-date');
        if (dateInput && pdfDate) {
            const d = dateInput.value;
            pdfDate.textContent = d ? d.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
        }

        const deliveryInput = document.getElementById('budget-delivery-input');
        const pdfDelivery = document.getElementById('pdf-delivery-date');
        if (deliveryInput && pdfDelivery) {
            pdfDelivery.textContent = deliveryInput.value || "A combinar";
        }

        const descInput = document.getElementById('budget-desc-input');
        const pdfDesc = document.getElementById('pdf-desc-text');
        if (descInput && pdfDesc) {
            pdfDesc.textContent = descInput.value || "[Insira a descrição geral do escopo do orçamento]";
        }

        const obsInput = document.getElementById('budget-obs-input');
        const pdfObs = document.getElementById('pdf-obs-text');
        if (obsInput && pdfObs) {
            pdfObs.textContent = obsInput.value || "Nenhuma";
        }

        const pdfNum = document.getElementById('pdf-budget-num');
        const numInput = document.getElementById('budget-number-input');
        if (pdfNum && numInput) {
            pdfNum.textContent = numInput.value || window.ForjaDB.getNextBudgetNumber();
        }

        // Category/Produto field in metadata
        const pdfCategory = document.getElementById('pdf-product-category');
        if (pdfCategory) {
            if (budgetItens.length === 0) {
                pdfCategory.textContent = "PRODUTO OU SERVIÇO";
            } else {
                const types = [...new Set(budgetItens.map(i => {
                    if (i.type === 'tools') return 'TOOLS';
                    if (i.type === 'impressao') return 'IMPRESSÃO 3D';
                    return 'PROJETO';
                }))];
                pdfCategory.textContent = types.join(' / ');
            }
        }

        // Render PDF Table
        const pdfItemsTbody = document.getElementById('pdf-items-tbody');
        const pdfTotalVal = document.getElementById('pdf-total-val');
        
        let total = 0;
        if (pdfItemsTbody) {
            if (budgetItens.length === 0) {
                // Empty rows placeholder
                pdfItemsTbody.innerHTML = Array(5).fill(0).map(() => `
                    <tr>
                        <td>&nbsp;</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                `).join('');
            } else {
                let rowsHtml = budgetItens.map(item => {
                    const subtotal = item.qty * item.value;
                    total += subtotal;
                    return `
                        <tr>
                            <td>${item.service}</td>
                            <td style="text-align:center;">${item.type === 'impressao' ? `R$ ${item.value.toFixed(2)}` : ''}</td>
                            <td style="text-align:center;">${item.type === 'projeto' ? `R$ ${item.value.toFixed(2)}` : ''}</td>
                            <td style="text-align:center;">${item.type === 'tools' ? `R$ ${item.value.toFixed(2)}` : ''}</td>
                            <td style="text-align:right; font-weight:bold;">${subtotal.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('');

                // Fill with some empty rows to keep PDF aesthetic
                if (budgetItens.length < 5) {
                    rowsHtml += Array(5 - budgetItens.length).fill(0).map(() => `
                        <tr>
                            <td>&nbsp;</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    `).join('');
                }
                pdfItemsTbody.innerHTML = rowsHtml;
            }
        }

        if (pdfTotalVal) {
            pdfTotalVal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        // Render Right Side Control Table
        const controlTbody = document.getElementById('budget-items-control-tbody');
        if (controlTbody) {
            if (budgetItens.length === 0) {
                controlTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:1rem 0;">Nenhum item inserido.</td></tr>`;
            } else {
                controlTbody.innerHTML = budgetItens.map((item, idx) => `
                    <tr>
                        <td><strong>${item.service}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${item.type.toUpperCase()})</span></td>
                        <td style="text-align:center;">${item.qty}</td>
                        <td style="text-align:right;">R$ ${(item.qty * item.value).toFixed(2)}</td>
                        <td style="text-align:right;">
                            <button type="button" class="btn-item-remove remove-budget-item-btn" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');

                document.querySelectorAll('.remove-budget-item-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(btn.getAttribute('data-idx'));
                        budgetItens.splice(idx, 1);
                        updatePDFPreview();
                    });
                });
            }
        }
    };

    const initBudgetGenerator = () => {
        budgetItens = [];
        activeBudgetId = null;
        
        // Setup dates defaults
        const dateInput = document.getElementById('budget-date-input');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }

        const numInput = document.getElementById('budget-number-input');
        if (numInput) {
            numInput.value = window.ForjaDB.getNextBudgetNumber();
        }

        const deliveryInput = document.getElementById('budget-delivery-input');
        if (deliveryInput) deliveryInput.value = "Entre 10/07 a 20/07";

        // Setup input event synchronization
        const syncInputs = ['budget-client-select', 'budget-date-input', 'budget-delivery-input', 'budget-desc-input', 'budget-obs-input'];
        syncInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.removeEventListener('input', updatePDFPreview);
                el.addEventListener('input', updatePDFPreview);
                el.removeEventListener('change', updatePDFPreview);
                el.addEventListener('change', updatePDFPreview);
            }
        });

        updatePDFPreview();
    };

    // Load tool select in budget builder
    const loadToolsSelect = () => {
        const select = document.getElementById('budget-tool-select');
        const wrapper = document.getElementById('stock-tool-select-wrapper');
        const typeSelect = document.getElementById('budget-item-type');

        if (!select || !wrapper || !typeSelect) return;

        typeSelect.addEventListener('change', () => {
            if (typeSelect.value === 'tools') {
                wrapper.style.display = 'block';
            } else {
                wrapper.style.display = 'none';
                select.value = '';
                document.getElementById('budget-item-name').value = '';
                document.getElementById('budget-item-val').value = '0.00';
            }
        });

        const inventory = window.ForjaDB.getInventory();
        select.innerHTML = `<option value="" selected>-- Digitar item manualmente --</option>` +
            inventory.map(p => `<option value="${p.id}" data-price="${p.sellPrice}">${p.name} (${p.brand})</option>`).join('');

        select.addEventListener('change', () => {
            const opt = select.options[select.selectedIndex];
            const nameInput = document.getElementById('budget-item-name');
            const priceInput = document.getElementById('budget-item-val');
            
            if (select.value) {
                nameInput.value = opt.text;
                priceInput.value = parseFloat(opt.getAttribute('data-price')).toFixed(2);
            } else {
                nameInput.value = '';
                priceInput.value = '0.00';
            }
        });

        // Auto-fill price and select product if typed manually matches inventory name or name (brand)
        const nameInput = document.getElementById('budget-item-name');
        const priceInput = document.getElementById('budget-item-val');
        
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                const val = nameInput.value.trim().toLowerCase();
                if (!val) return;
                
                const matched = inventory.find(p => 
                    p.name.toLowerCase() === val || 
                    `${p.name} (${p.brand})`.toLowerCase() === val
                );
                
                if (matched) {
                    priceInput.value = parseFloat(matched.sellPrice).toFixed(2);
                    typeSelect.value = 'tools';
                    select.value = matched.id;
                }
            });
        }
    };

    // Add Item Submit
    if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('budget-item-type').value;
            const service = document.getElementById('budget-item-name').value.trim();
            const qty = parseInt(document.getElementById('budget-item-qty').value) || 1;
            const value = parseFloat(document.getElementById('budget-item-val').value) || 0;
            const toolSelect = document.getElementById('budget-tool-select');
            const productId = (type === 'tools' && toolSelect) ? toolSelect.value : null;

            budgetItens.push({ service, type, value, qty, total: qty * value, productId });
            
            // Reset item form inputs
            document.getElementById('budget-item-name').value = '';
            document.getElementById('budget-item-qty').value = '1';
            document.getElementById('budget-item-val').value = '0.00';
            document.getElementById('budget-tool-select').value = '';

            updatePDFPreview();
        });
    }

    // Clear Budget Button
    const btnClear = document.getElementById('btn-clear-budget');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm("Deseja realmente limpar as informações do orçamento atual?")) {
                initBudgetGenerator();
                document.getElementById('budget-meta-form').reset();
                initBudgetGenerator();
            }
        });
    }

    // Save Budget Button
    const btnSave = document.getElementById('btn-save-budget');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const clientSelect = document.getElementById('budget-client-select');
            if (!clientSelect.value) {
                alert("Por favor, selecione um cliente!");
                return;
            }
            if (budgetItens.length === 0) {
                alert("Por favor, adicione ao menos um item ao orçamento!");
                return;
            }

            const number = parseInt(document.getElementById('budget-number-input').value);
            const clientId = clientSelect.value;
            const clientName = clientSelect.options[clientSelect.selectedIndex].text;
            const date = document.getElementById('budget-date-input').value;
            const deliveryDate = document.getElementById('budget-delivery-input').value;
            const observations = document.getElementById('budget-obs-input').value.trim();
            const desc = document.getElementById('budget-desc-input').value.trim();
            
            const totalValue = budgetItens.reduce((sum, i) => sum + i.total, 0);

            const budgetData = {
                number,
                clientId,
                clientName,
                date,
                deliveryDate,
                itens: budgetItens,
                observations,
                desc,
                status: 'EM ABERTO',
                totalValue,
                stockDeducted: false
            };

            if (activeBudgetId) {
                // We are updating an existing one
                const budgets = window.ForjaDB.getBudgets();
                const idx = budgets.findIndex(b => b.number === activeBudgetId);
                if (idx !== -1) {
                    budgets[idx] = budgetData;
                    window.ForjaDB.saveBudgets(budgets);
                    alert("Orçamento atualizado no histórico!");
                }
            } else {
                // Save new budget
                window.ForjaDB.addBudget(budgetData);
                alert(`Orçamento nº ${number} cadastrado com sucesso!`);
            }

            initBudgetGenerator();
            document.getElementById('budget-meta-form').reset();
            initBudgetGenerator();
        });
    }

    // Print / Generate PDF Trigger
    const btnPrint = document.getElementById('btn-print-pdf');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            const clientSelect = document.getElementById('budget-client-select');
            if (!clientSelect.value) {
                alert("Selecione um cliente para gerar a via do PDF!");
                return;
            }
            if (budgetItens.length === 0) {
                alert("Insira ao menos um item para impressão!");
                return;
            }
            
            // Trigger standard browser printing
            window.print();
        });
    }


    // ==========================================
    // BUDGET HISTORY (STATUS & LOAD)
    // ==========================================
    const historyTbody = document.getElementById('budget-history-tbody');

    const renderBudgetsHistory = () => {
        if (!historyTbody) return;
        const budgets = window.ForjaDB.getBudgets();

        if (budgets.length === 0) {
            historyTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding: 2rem;">Nenhum orçamento gerado ainda.</td></tr>`;
            return;
        }

        historyTbody.innerHTML = budgets.map(b => {
            const totalBRL = b.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const datePart = b.date.includes('T') ? b.date.split('T')[0] : b.date;
            const dateFormatted = datePart.split('-').reverse().join('/');
            const isFaturado = b.status === 'PRODUTO FATURADO' || b.status === 'PRODUTO COMPRADO';
            
            return `
                <tr data-num="${b.number}">
                    <td><strong>#${b.number}</strong></td>
                    <td><strong>${b.clientName}</strong></td>
                    <td>${dateFormatted}</td>
                    <td style="text-align:right; font-weight:bold; color:var(--text-primary);">${totalBRL}</td>
                    <td style="text-align:center;">
                        <select class="status-select" data-num="${b.number}" ${isFaturado ? 'disabled' : ''} style="padding: 0.25rem 0.5rem; font-size:0.8rem; font-family:var(--font-body); border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-secondary); color:var(--text-primary); cursor:${isFaturado ? 'not-allowed' : 'pointer'}; opacity:${isFaturado ? '0.75' : '1'};">
                            <option value="EM ABERTO" ${b.status === 'EM ABERTO' ? 'selected' : ''}>EM ABERTO</option>
                            <option value="PRODUTO FATURADO" ${isFaturado ? 'selected' : ''} style="color:#25d366;">FATURADO</option>
                            <option value="ORÇAMENTO PERDIDO" ${b.status === 'ORÇAMENTO PERDIDO' ? 'selected' : ''} style="color:#ef4444;">PERDIDO</option>
                        </select>
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                        ${isFaturado ? `
                        <button class="revert-budget-btn" data-num="${b.number}" title="Estornar e Liberar Edição" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:0.85rem; font-weight:600; padding:0.5rem; margin-right:0.25rem; font-family:var(--font-heading);">
                            <i class="fa-solid fa-arrow-rotate-left"></i> Estornar
                        </button>
                        ` : `
                        <button class="load-budget-btn" data-num="${b.number}" title="Abrir no Editor" style="background:none; border:none; color:var(--accent-light); cursor:pointer; font-size:1.05rem; padding:0.5rem; margin-right:0.25rem;">
                            <i class="fa-solid fa-folder-open"></i> Abrir
                        </button>
                        `}
                        <button class="delete-budget-btn" data-num="${b.number}" title="Excluir Registro" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.05rem; padding:0.5rem;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        attachHistoryEvents();
    };

    const attachHistoryEvents = () => {
        // Change Status Dropdown
        document.querySelectorAll('.status-select').forEach(select => {
            let oldValue = select.value;
            select.addEventListener('focus', () => {
                oldValue = select.value;
            });

            select.addEventListener('change', (e) => {
                const num = parseInt(select.getAttribute('data-num'));
                const newStatus = select.value;

                const budgets = window.ForjaDB.getBudgets();
                const budgetIdx = budgets.findIndex(b => b.number === num);
                
                if (budgetIdx === -1) {
                    alert("Orçamento não encontrado!");
                    select.value = oldValue;
                    return;
                }

                const budget = budgets[budgetIdx];
                const wasPurchased = budget.status === 'PRODUTO COMPRADO' || budget.status === 'PRODUTO FATURADO' || budget.stockDeducted === true;
                const isPurchasing = newStatus === 'PRODUTO FATURADO' || newStatus === 'PRODUTO COMPRADO';

                if (isPurchasing && !wasPurchased) {
                    // Check stock first
                    const inventory = window.ForjaDB.getInventory();
                    let stockError = false;
                    let errorMessage = "";

                    // Validate stock
                    for (const item of budget.itens) {
                        if (item.type === 'tools' && item.productId) {
                            const product = inventory.find(p => p.id === item.productId);
                            if (!product) continue;
                            if (product.stock < item.qty) {
                                stockError = true;
                                errorMessage += `Produto: ${product.name} (Disponível: ${product.stock}, Necessário: ${item.qty})\n`;
                            }
                        }
                    }

                    if (stockError) {
                        alert("Estoque insuficiente para faturar este orçamento!\n\n" + errorMessage);
                        select.value = oldValue;
                        return;
                    }

                    // Deduct stock
                    for (const item of budget.itens) {
                        if (item.type === 'tools' && item.productId) {
                            window.ForjaDB.registerSale(item.productId, item.qty);
                        }
                    }
                    budget.stockDeducted = true;
                    budget.status = 'PRODUTO FATURADO';
                    window.ForjaDB.saveBudgets(budgets);
                    alert(`Orçamento #${num} finalizado! Estoque atualizado no catálogo.`);
                    renderDashboard(); // Refresh stocks & dashboard metrics!

                } else if (!isPurchasing && wasPurchased) {
                    // Revert stock (returning products back to inventory)
                    const inventory = window.ForjaDB.getInventory();
                    for (const item of budget.itens) {
                        if (item.type === 'tools' && item.productId) {
                            const product = inventory.find(p => p.id === item.productId);
                            if (product) {
                                product.stock = (product.stock || 0) + item.qty;
                                product.soldCount = Math.max(0, (product.soldCount || 0) - item.qty);
                            }
                        }
                    }
                    window.ForjaDB.saveInventory(inventory);
                    budget.stockDeducted = false;
                    budget.status = newStatus;
                    window.ForjaDB.saveBudgets(budgets);
                    alert(`Status do orçamento #${num} alterado para ${newStatus}. Itens devolvidos ao estoque.`);
                    renderDashboard();

                } else {
                    // Simple status update (EM ABERTO <-> PERDIDO)
                    budget.status = newStatus;
                    window.ForjaDB.saveBudgets(budgets);
                }

                oldValue = newStatus;
                renderBudgetsHistory(); // Re-render history to keep UI updated
            });
        });

        // Load Budget back to form & Preview
        document.querySelectorAll('.load-budget-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-num'));
                const budgets = window.ForjaDB.getBudgets();
                const b = budgets.find(item => item.number === num);
                
                if (b) {
                    activeBudgetId = b.number;
                    budgetItens = [...b.itens];

                    // Set Form Values
                    document.getElementById('budget-client-select').value = b.clientId;
                    document.getElementById('budget-number-input').value = b.number;
                    document.getElementById('budget-date-input').value = b.date;
                    document.getElementById('budget-delivery-input').value = b.deliveryDate;
                    document.getElementById('budget-desc-input').value = b.desc || '';
                    document.getElementById('budget-obs-input').value = b.observations || '';

                    // Trigger Sync to PDF Preview
                    updatePDFPreview();

                    // Switch tab to Generator
                    const generatorTabBtn = document.querySelector('.tab-btn[data-tab="tab-gerador"]');
                    if (generatorTabBtn) generatorTabBtn.click();
                    
                    alert(`Orçamento #${b.number} carregado no editor com sucesso!`);
                }
            });
        });

        // Delete Budget
        document.querySelectorAll('.delete-budget-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-num'));
                if (confirm(`Deseja realmente excluir o registro do orçamento #${num}?`)) {
                    const budgets = window.ForjaDB.getBudgets();
                    const b = budgets.find(item => item.number === num);
                    if (b && b.stockDeducted === true) {
                        // Return stock
                        const inventory = window.ForjaDB.getInventory();
                        for (const item of b.itens) {
                            if (item.type === 'tools' && item.productId) {
                                const product = inventory.find(p => p.id === item.productId);
                                if (product) {
                                    product.stock = (product.stock || 0) + item.qty;
                                    product.soldCount = Math.max(0, (product.soldCount || 0) - item.qty);
                                }
                            }
                        }
                        window.ForjaDB.saveInventory(inventory);
                    }
                    window.ForjaDB.deleteBudget(num);
                    renderBudgetsHistory();
                    renderDashboard();
                }
            });
        });

        // Estornar / Revert Budget Button
        document.querySelectorAll('.revert-budget-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-num'));
                if (!confirm(`Tem certeza que deseja estornar o orçamento #${num}? O estoque dos produtos será devolvido ao catálogo e o status voltará para EM ABERTO.`)) {
                    return;
                }
                
                const budgets = window.ForjaDB.getBudgets();
                const budgetIdx = budgets.findIndex(b => b.number === num);
                if (budgetIdx === -1) return;
                
                const budget = budgets[budgetIdx];
                const wasPurchased = budget.status === 'PRODUTO COMPRADO' || budget.status === 'PRODUTO FATURADO' || budget.stockDeducted === true;
                
                if (wasPurchased) {
                    // Revert stock
                    const inventory = window.ForjaDB.getInventory();
                    for (const item of budget.itens) {
                        if (item.type === 'tools' && item.productId) {
                            const product = inventory.find(p => p.id === item.productId);
                            if (product) {
                                product.stock = (product.stock || 0) + item.qty;
                                product.soldCount = Math.max(0, (product.soldCount || 0) - item.qty);
                            }
                        }
                    }
                    window.ForjaDB.saveInventory(inventory);
                }
                
                budget.stockDeducted = false;
                budget.status = 'EM ABERTO';
                window.ForjaDB.saveBudgets(budgets);
                
                alert(`Orçamento #${num} estornado com sucesso! Agora você pode editá-lo novamente.`);
                renderDashboard();
                renderBudgetsHistory();
            });
        });
    };

    // --- Mobile PDF Toggle ---
    const openMobilePdfBtn = document.getElementById('open-mobile-pdf-btn');
    const closeMobilePdfBtn = document.getElementById('close-mobile-pdf-btn');
    const adminSidebar = document.getElementById('admin-sidebar');

    if (openMobilePdfBtn && adminSidebar) {
        openMobilePdfBtn.addEventListener('click', () => {
            adminSidebar.classList.add('active-mobile-pdf');
        });
    }

    if (closeMobilePdfBtn && adminSidebar) {
        closeMobilePdfBtn.addEventListener('click', () => {
            adminSidebar.classList.remove('active-mobile-pdf');
        });
    }

    // Run auth check with Cloud sync loading
    const syncOverlay = document.getElementById('sync-loader-overlay');
    if (syncOverlay) {
        syncOverlay.style.display = 'flex';
        syncOverlay.style.opacity = '1';
        
        window.ForjaDB.syncLoad().then(() => {
            checkAuth();
            syncOverlay.style.opacity = '0';
            setTimeout(() => {
                syncOverlay.style.display = 'none';
            }, 400);
        }).catch(err => {
            console.error("Erro na sincronização inicial:", err);
            checkAuth();
            syncOverlay.style.display = 'none';
        });
    } else {
        checkAuth();
    }
});
