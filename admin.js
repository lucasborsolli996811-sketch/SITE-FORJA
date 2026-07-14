/* ==========================================
   FORJA — Admin Console Script
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let budgetItens = [];
    let activeBudgetId = null; // To keep track if we are editing/viewing an existing budget
    let editingClientId = null; // To keep track if we are editing an existing client

    // --- Authentication State ---
    const checkAuth = (user) => {
        const loggedOutView = document.getElementById('sidebar-logged-out-view');
        const loggedInView = document.getElementById('sidebar-logged-in-view');

        if (user) {
            document.body.classList.add('logged-in-admin');
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('dashboard-view').style.display = 'block';
            
            // Show PDF preview in sidebar
            if (loggedOutView) loggedOutView.style.display = 'none';
            if (loggedInView) loggedInView.style.display = 'block';
            
            // Sync Admin DB Data securely
            const syncOverlay = document.getElementById('sync-loader-overlay');
            if (syncOverlay) {
                syncOverlay.style.display = 'flex';
                syncOverlay.style.opacity = '1';
                
                window.ForjaDB.syncLoadAdmin().then(() => {
                    renderDashboard();
                    loadClientsSelects();
                    loadToolsSelect();
                    initBudgetGenerator();
                }).catch(err => {
                    console.error("Erro ao sincronizar admin:", err);
                }).finally(() => {
                    syncOverlay.style.opacity = '0';
                    setTimeout(() => {
                        syncOverlay.style.display = 'none';
                    }, 400);
                });
            } else {
                window.ForjaDB.syncLoadAdmin().then(() => {
                    renderDashboard();
                    loadClientsSelects();
                    loadToolsSelect();
                    initBudgetGenerator();
                });
            }

        } else {
            document.body.classList.remove('logged-in-admin');
            document.getElementById('login-view').style.display = 'block';
            document.getElementById('dashboard-view').style.display = 'none';
            
            // Show default giant logo in sidebar
            if (loggedOutView) loggedOutView.style.display = 'block';
            if (loggedInView) loggedInView.style.display = 'none';
            
            // Hide sync overlay if it's showing (since we are not syncing admin data if logged out)
            const syncOverlay = document.getElementById('sync-loader-overlay');
            if (syncOverlay) {
                syncOverlay.style.opacity = '0';
                setTimeout(() => {
                    syncOverlay.style.display = 'none';
                }, 400);
            }
        }
    };

    // Firebase Auth Listener
    window.ForjaDB.setAuthStateListener((user) => {
        checkAuth(user);
    });

    // --- Login Form ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim(); // Now treats as Email
            const pass = document.getElementById('password').value.trim();

            if(loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...';
            }

            window.ForjaDB.loginAdmin(user, pass)
                .then(() => {
                    loginError.style.display = 'none';
                    loginForm.reset();
                })
                .catch((error) => {
                    console.error("Erro de login:", error);
                    loginError.textContent = "Credenciais inválidas ou acesso negado!";
                    loginError.style.display = 'block';
                })
                .finally(() => {
                    if(loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.innerHTML = 'Acessar Sistema';
                    }
                });
        });
    }

    // --- Logout ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.ForjaDB.logoutAdmin();
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
        const pdfClientAddress = document.getElementById('pdf-client-address');
        const pdfClientPhone = document.getElementById('pdf-client-phone');
        const pdfClientEmail = document.getElementById('pdf-client-email');
        if (clientSelect && pdfClientName) {
            const clients = window.ForjaDB.getClients();
            const client = clients.find(c => c.id === clientSelect.value);
            pdfClientName.textContent = client ? client.name : "NENHUM SELECIONADO";
            if (pdfClientAddress) pdfClientAddress.textContent = client ? client.address : "-";
            if (pdfClientPhone) pdfClientPhone.textContent = client ? client.phone : "-";
            if (pdfClientEmail) pdfClientEmail.textContent = client ? client.email : "-";
        }

        const dateInput = document.getElementById('budget-date-input');
        const pdfDate = document.getElementById('pdf-budget-date');
        if (dateInput && pdfDate) {
            const d = dateInput.value;
            pdfDate.textContent = d ? d.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
        }

        const deliveryInput = document.getElementById('budget-delivery-input');
        const pdfDelivery = document.getElementById('pdf-prazo-val');
        if (deliveryInput && pdfDelivery) {
            pdfDelivery.textContent = deliveryInput.value || "A combinar";
        }

        const showPaymentCheckbox = document.getElementById('budget-show-payment');
        const pdfPaymentText = document.getElementById('pdf-payment-text');
        if (pdfPaymentText) {
            if (showPaymentCheckbox && showPaymentCheckbox.checked) {
                pdfPaymentText.innerHTML = `
                    <p>• Pix: <strong>67.723.944/001-68</strong> — CNPJ — Nubank — Lucas Borsolli</p>
                    <p>• Cartão de Crédito: Parcelamento em até 3x sem juros (para valores acima de R$60,00)</p>
                    <p>• Condição: 50% antecipado para início da produção e 50% na entrega.</p>
                `;
            } else {
                pdfPaymentText.innerHTML = '';
            }
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

        // New Meta Fields
        const vendedorInput = document.getElementById('budget-vendedor-input');
        const pdfVendedor = document.getElementById('pdf-vendedor-val');
        if (vendedorInput && pdfVendedor) {
            pdfVendedor.textContent = vendedorInput.value || "Lucas";
        }

        const validadeInput = document.getElementById('budget-validade-input');
        const pdfValidade = document.getElementById('pdf-validade-val');
        if (validadeInput && pdfValidade) {
            pdfValidade.textContent = validadeInput.value || "7 dias";
        }

        const pagamentoInput = document.getElementById('budget-pagamento-input');
        const pdfPagamento = document.getElementById('pdf-pagamento-val');
        if (pagamentoInput && pdfPagamento) {
            pdfPagamento.textContent = pagamentoInput.value || "A combinar";
        }

        const freteInput = document.getElementById('budget-frete-input');
        const pdfFrete = document.getElementById('pdf-frete-val');
        const frete = parseFloat(freteInput ? freteInput.value : 0) || 0;
        if (pdfFrete) {
            pdfFrete.textContent = frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        // Render PDF Table
        const pdfItemsTbody = document.getElementById('pdf-items-tbody');
        const pdfSubtotalVal = document.getElementById('pdf-subtotal-val');
        const pdfTotalVal = document.getElementById('pdf-total-val');
        
        let subtotal = 0;
        if (pdfItemsTbody) {
            if (budgetItens.length === 0) {
                // Empty rows placeholder
                pdfItemsTbody.innerHTML = Array(5).fill(0).map(() => `
                    <tr>
                        <td>&nbsp;</td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                `).join('');
            } else {
                let rowsHtml = budgetItens.map(item => {
                    const rowTotal = item.qty * item.value;
                    subtotal += rowTotal;
                    
                    let descHtml = `<strong>${item.service}</strong>`;
                    if (item.details) {
                        descHtml += `<div style="font-size: 0.65rem; color: #555; margin-top: 0.15rem; font-style: italic;">${item.details}</div>`;
                    }
                    
                    return `
                        <tr>
                            <td>${descHtml}</td>
                            <td style="text-align:center;">${item.qty}</td>
                            <td style="text-align:right;">${item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td style="text-align:right; font-weight:bold;">${rowTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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
                        </tr>
                    `).join('');
                }
                pdfItemsTbody.innerHTML = rowsHtml;
            }
        }

        if (pdfSubtotalVal) {
            pdfSubtotalVal.textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        const total = subtotal + frete;
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

    const toggleEditorLock = (locked) => {
        const inputs = [
            'budget-client-select',
            'budget-date-input',
            'budget-delivery-input',
            'budget-desc-input',
            'budget-obs-input',
            'budget-vendedor-input',
            'budget-validade-input',
            'budget-pagamento-input',
            'budget-frete-input',
            'budget-item-type',
            'budget-tool-select',
            'budget-item-name',
            'budget-item-details',
            'budget-item-qty',
            'budget-item-val'
        ];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = locked;
        });

        const btnAddItem = document.getElementById('btn-add-budget-item');
        if (btnAddItem) {
            btnAddItem.disabled = locked;
            btnAddItem.style.opacity = locked ? '0.5' : '1';
            btnAddItem.style.cursor = locked ? 'not-allowed' : 'pointer';
        }
        
        const btnSave = document.getElementById('btn-save-budget');
        if (btnSave) {
            btnSave.disabled = locked;
            btnSave.style.opacity = locked ? '0.5' : '1';
            btnSave.style.cursor = locked ? 'not-allowed' : 'pointer';
        }

        let banner = document.getElementById('budget-lock-banner');
        if (locked) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'budget-lock-banner';
                banner.style.cssText = 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.9rem; font-weight: 600; text-align: center; width: 100%; box-sizing: border-box;';
                banner.innerHTML = '<i class="fa-solid fa-lock"></i> MODO LEITURA: Orçamento Faturado/Cancelado. Estorne no histórico para editar.';
                const form = document.getElementById('budget-meta-form');
                if (form) form.insertBefore(banner, form.firstChild);
            }
        } else {
            if (banner) banner.remove();
        }
    };

    const loadBudgetToEditor = (num) => {
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
            document.getElementById('budget-vendedor-input').value = b.vendedor || 'Rafael';
            document.getElementById('budget-validade-input').value = b.validadeDate || '7 dias';
            document.getElementById('budget-pagamento-input').value = b.paymentCond || 'A combinar';
            document.getElementById('budget-frete-input').value = b.frete || 0;

            // Check if faturado or lost to toggle editor lock
            const isLocked = b.status === 'PRODUTO FATURADO' || b.status === 'PRODUTO COMPRADO' || b.status === 'ORÇAMENTO PERDIDO';
            toggleEditorLock(isLocked);

            // Trigger Sync to PDF Preview
            updatePDFPreview();

            // Switch tab to Generator
            const generatorTabBtn = document.querySelector('.tab-btn[data-tab="tab-gerador"]');
            if (generatorTabBtn) generatorTabBtn.click();
            
            if (isLocked) {
                alert(`Orçamento #${b.number} carregado em MODO LEITURA para visualização do PDF!`);
            } else {
                alert(`Orçamento #${b.number} carregado no editor com sucesso!`);
            }
        }
    };

    const initBudgetGenerator = () => {
        budgetItens = [];
        activeBudgetId = null;
        toggleEditorLock(false);
        
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

        const vendedorInput = document.getElementById('budget-vendedor-input');
        if (vendedorInput) vendedorInput.value = "Rafael";

        const validadeInput = document.getElementById('budget-validade-input');
        if (validadeInput) validadeInput.value = "7 dias";

        const pagamentoInput = document.getElementById('budget-pagamento-input');
        if (pagamentoInput) pagamentoInput.value = "A combinar";

        const freteInput = document.getElementById('budget-frete-input');
        if (freteInput) freteInput.value = "0.00";

        // Setup input event synchronization
        const syncInputs = [
            'budget-client-select', 
            'budget-date-input', 
            'budget-delivery-input', 
            'budget-desc-input', 
            'budget-obs-input',
            'budget-vendedor-input',
            'budget-validade-input',
            'budget-pagamento-input',
            'budget-frete-input'
        ];
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
            const details = document.getElementById('budget-item-details') ? document.getElementById('budget-item-details').value.trim() : '';
            const qty = parseInt(document.getElementById('budget-item-qty').value) || 1;
            const value = parseFloat(document.getElementById('budget-item-val').value) || 0;
            const toolSelect = document.getElementById('budget-tool-select');
            const productId = (type === 'tools' && toolSelect) ? toolSelect.value : null;

            budgetItens.push({ service, details, type, value, qty, total: qty * value, productId });
            
            // Reset item form inputs
            document.getElementById('budget-item-name').value = '';
            if (document.getElementById('budget-item-details')) {
                document.getElementById('budget-item-details').value = '';
            }
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
            
            const vendedor = document.getElementById('budget-vendedor-input') ? document.getElementById('budget-vendedor-input').value.trim() : 'Rafael';
            const validadeDate = document.getElementById('budget-validade-input') ? document.getElementById('budget-validade-input').value.trim() : '7 dias';
            const paymentCond = document.getElementById('budget-pagamento-input') ? document.getElementById('budget-pagamento-input').value.trim() : 'A combinar';
            const frete = parseFloat(document.getElementById('budget-frete-input') ? document.getElementById('budget-frete-input').value : 0) || 0;

            const itemsTotal = budgetItens.reduce((sum, i) => sum + i.total, 0);
            const totalValue = itemsTotal + frete;

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
                vendedor,
                validadeDate,
                paymentCond,
                frete,
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
            
            // Safe Date Formatting
            const datePart = b.date && b.date.includes('T') ? b.date.split('T')[0] : b.date;
            const dateFormatted = datePart ? datePart.split('-').reverse().join('/') : '-';
            
            let statusDateLine = '';
            if (b.status === 'PRODUTO FATURADO' || b.status === 'PRODUTO COMPRADO') {
                const sDate = b.statusDate || b.date;
                const sDatePart = sDate && sDate.includes('T') ? sDate.split('T')[0] : sDate;
                const sDateFormatted = sDatePart ? sDatePart.split('-').reverse().join('/') : '-';
                statusDateLine = `<div style="font-size:0.75rem; color:#25d366; margin-top:0.2rem;" title="Data do Faturamento"><i class="fa-solid fa-circle-check"></i> Faturado: ${sDateFormatted}</div>`;
            } else if (b.status === 'ORÇAMENTO PERDIDO') {
                const sDate = b.statusDate || b.date;
                const sDatePart = sDate && sDate.includes('T') ? sDate.split('T')[0] : sDate;
                const sDateFormatted = sDatePart ? sDatePart.split('-').reverse().join('/') : '-';
                statusDateLine = `<div style="font-size:0.75rem; color:#ef4444; margin-top:0.2rem;" title="Data do Cancelamento"><i class="fa-solid fa-circle-xmark"></i> Perdido: ${sDateFormatted}</div>`;
            }

            const datesHtml = `
                <div style="font-size:0.85rem; font-weight:500;">Gerado: ${dateFormatted}</div>
                ${statusDateLine}
            `;

            const isFaturado = b.status === 'PRODUTO FATURADO' || b.status === 'PRODUTO COMPRADO';
            
            return `
                <tr data-num="${b.number}">
                    <td><strong>#${b.number}</strong></td>
                    <td><strong>${b.clientName}</strong></td>
                    <td>${datesHtml}</td>
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
                        <button class="view-pdf-btn" data-num="${b.number}" title="Visualizar PDF" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:1.05rem; padding:0.5rem; margin-right:0.25rem;">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
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
                    budget.statusDate = new Date().toISOString();
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
                    budget.statusDate = newStatus === 'ORÇAMENTO PERDIDO' ? new Date().toISOString() : null;
                    window.ForjaDB.saveBudgets(budgets);
                    alert(`Status do orçamento #${num} alterado para ${newStatus}. Itens devolvidos ao estoque.`);
                    renderDashboard();

                } else {
                    // Simple status update (EM ABERTO <-> PERDIDO)
                    budget.status = newStatus;
                    budget.statusDate = newStatus === 'ORÇAMENTO PERDIDO' ? new Date().toISOString() : null;
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
                loadBudgetToEditor(num);
            });
        });

        // View PDF Button
        document.querySelectorAll('.view-pdf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-num'));
                loadBudgetToEditor(num);
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
                budget.statusDate = null;
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

    // Remove duplicate initial syncLoad and let Firebase Auth trigger it.
});
