/* ==========================================
   FORJA — Cart & Catalog Script
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let cart = [];
    const whatsappNumber = "5514996811628";

    // --- Elements ---
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartEmptyMsg = document.getElementById('cart-empty-msg');
    const cartTotalCount = document.getElementById('cart-total-count');
    const cartBadge = document.getElementById('cart-badge');
    const btnRequestQuoteWhatsapp = document.getElementById('btn-request-quote-whatsapp');
    const btnRequestQuoteEmail = document.getElementById('btn-request-quote-email');

    // --- UI Toggles ---
    const openCart = () => {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeCart = () => {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // --- Render Cart ---
    const updateCartUI = () => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        // Update badge
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            if (totalItems > 0) {
                cartBadge.classList.add('pop');
                setTimeout(() => cartBadge.classList.remove('pop'), 300);
            }
        }
        
        // Update total count
        if (cartTotalCount) cartTotalCount.textContent = totalItems;

        // Toggle empty message
        if (cart.length === 0) {
            cartEmptyMsg.style.display = 'block';
            cartItemsContainer.innerHTML = '';
            if (btnRequestQuoteWhatsapp) {
                btnRequestQuoteWhatsapp.disabled = true;
                btnRequestQuoteWhatsapp.style.opacity = '0.5';
                btnRequestQuoteWhatsapp.style.cursor = 'not-allowed';
            }
            if (btnRequestQuoteEmail) {
                btnRequestQuoteEmail.disabled = true;
                btnRequestQuoteEmail.style.opacity = '0.5';
                btnRequestQuoteEmail.style.cursor = 'not-allowed';
            }
            return;
        }

        cartEmptyMsg.style.display = 'none';
        if (btnRequestQuoteWhatsapp) {
            btnRequestQuoteWhatsapp.disabled = false;
            btnRequestQuoteWhatsapp.style.opacity = '1';
            btnRequestQuoteWhatsapp.style.cursor = 'pointer';
        }
        if (btnRequestQuoteEmail) {
            btnRequestQuoteEmail.disabled = false;
            btnRequestQuoteEmail.style.opacity = '1';
            btnRequestQuoteEmail.style.cursor = 'pointer';
        }

        // Render items
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-info">
                    <span>${item.brand}</span>
                    <h4>${item.name}</h4>
                    <div class="cart-item-actions">
                        <div class="qty-control" style="height: 32px; width: 100px;">
                            <button class="qty-btn cart-qty-minus" data-id="${item.id}"><i class="fa-solid fa-minus" style="font-size: 0.7rem;"></i></button>
                            <input type="number" class="qty-input" value="${item.quantity}" readonly>
                            <button class="qty-btn cart-qty-plus" data-id="${item.id}"><i class="fa-solid fa-plus" style="font-size: 0.7rem;"></i></button>
                        </div>
                        <button class="cart-item-remove" data-id="${item.id}">
                            <i class="fa-solid fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Attach listeners to newly rendered cart items
        attachCartListeners();
    };

    const attachCartListeners = () => {
        document.querySelectorAll('.cart-qty-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = cart.find(i => i.id === id);
                if (item) {
                    item.quantity++;
                    updateCartUI();
                }
            });
        });

        document.querySelectorAll('.cart-qty-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = cart.find(i => i.id === id);
                if (item && item.quantity > 1) {
                    item.quantity--;
                    updateCartUI();
                }
            });
        });

        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                cart = cart.filter(i => i.id !== id);
                updateCartUI();
            });
        });
    };

    // --- Render Dynamic Catalog ---
    const catalogContainer = document.getElementById('catalog-container');

    const renderDynamicCatalog = () => {
        if (!catalogContainer) return;

        const catalog = window.ForjaDB.getAvailableCatalog();
        const brands = Object.keys(catalog);

        if (brands.length === 0) {
            catalogContainer.innerHTML = `
                <section class="catalog-section">
                    <div class="container" style="text-align: center; padding: 4rem 1rem;">
                        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <p style="color: var(--text-secondary);">Nenhuma ferramenta disponível no estoque no momento.</p>
                    </div>
                </section>
            `;
            return;
        }

        let html = '';
        for (const brand of brands) {
            const products = catalog[brand];
            html += `
                <section class="catalog-section" id="marca-${brand.toLowerCase()}">
                    <div class="container">
                        <div class="brand-header">
                            <div class="brand-line"></div>
                            <h2 class="brand-title">${brand}</h2>
                            <div class="brand-line"></div>
                        </div>
                        <div class="products-grid">
                            ${products.map(p => `
                                <div class="product-card">
                                    <div class="product-img-wrap">
                                        ${p.img ? `<img src="${p.img}" alt="${p.name}" class="product-img" style="max-height:100%; object-fit:contain;">` : `
                                            <div class="product-placeholder">
                                                <i class="fa-solid fa-wrench"></i>
                                                <span>Imagem em Breve</span>
                                            </div>
                                        `}
                                    </div>
                                    <div class="product-info">
                                        <span class="product-brand">${p.brand}</span>
                                        <h3 class="product-name">${p.name}</h3>
                                        <p class="product-desc">${p.desc}</p>
                                        <p class="product-stock" style="font-size:0.8rem; color:var(--text-muted); margin-bottom: 1rem;">
                                            Disponível: <strong>${p.stock}</strong> unidades
                                        </p>
                                        <div class="product-actions">
                                            <div class="qty-control">
                                                <button class="qty-btn qty-minus" data-id="${p.id}"><i class="fa-solid fa-minus"></i></button>
                                                <input type="number" class="qty-input" value="1" min="1" max="${p.stock}" step="1" data-id="${p.id}" readonly>
                                                <button class="qty-btn qty-plus" data-id="${p.id}"><i class="fa-solid fa-plus"></i></button>
                                            </div>
                                            <button class="btn btn-primary add-to-cart-btn" data-id="${p.id}" data-name="${p.name}" data-brand="${p.brand}" data-max="${p.stock}">
                                                <i class="fa-solid fa-cart-plus"></i>
                                                <span>Adicionar</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
            `;
        }
        catalogContainer.innerHTML = html;
        attachCatalogListeners();
    };

    const attachCatalogListeners = () => {
        document.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const input = document.querySelector(`.qty-input[data-id="${id}"]`);
                if (input) {
                    const max = parseInt(input.getAttribute('max')) || 999;
                    let val = parseInt(input.value) || 1;
                    if (val < max) {
                        input.value = val + 1;
                    }
                }
            });
        });

        document.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const input = document.querySelector(`.qty-input[data-id="${id}"]`);
                if (input) {
                    let val = parseInt(input.value) || 1;
                    if (val > 1) {
                        input.value = val - 1;
                    }
                }
            });
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const brand = btn.getAttribute('data-brand');
                const max = parseInt(btn.getAttribute('data-max')) || 0;
                
                const input = document.querySelector(`.qty-input[data-id="${id}"]`);
                const qty = input ? (parseInt(input.value) || 1) : 1;

                const existingItem = cart.find(i => i.id === id);
                const currentQtyInCart = existingItem ? existingItem.quantity : 0;
                
                if (currentQtyInCart + qty > max) {
                    alert(`Desculpe, você já tem ${currentQtyInCart} itens no carrinho e o estoque limite é de ${max} unidades.`);
                    if (input) input.value = 1;
                    return;
                }

                if (existingItem) {
                    existingItem.quantity += qty;
                } else {
                    cart.push({ id, name, brand, quantity: qty });
                }

                updateCartUI();
                openCart();
                
                if (input) input.value = 1;
            });
        });
    };

    // Run dynamic catalog render
    // Initialize Catalog from DB after sync (Public mode)
    window.ForjaDB.syncLoadPublic().then(() => {
        renderDynamicCatalog();
    });

    // --- Request Quote (WhatsApp) ---
    if (btnRequestQuoteWhatsapp) {
        btnRequestQuoteWhatsapp.addEventListener('click', () => {
            if (cart.length === 0) return;

            let text = "Olá! Gostaria de solicitar um orçamento para os seguintes itens da aba Usinagem:\n\n";
            cart.forEach(item => {
                text += `• ${item.quantity}x ${item.name} (${item.brand})\n`;
                window.ForjaDB.registerQuote(item.id, item.quantity);
            });
            text += "\nAguardo o retorno. Obrigado!";

            const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        });
    }

    // --- Request Quote (Email) ---
    if (btnRequestQuoteEmail) {
        btnRequestQuoteEmail.addEventListener('click', () => {
            if (cart.length === 0) return;

            const companyEmail = "Forja3dprojetos@gmail.com";
            const subject = "Solicitação de Orçamento - Forja Usinagem";
            
            let body = "Prezada equipe Forja,\n\n";
            body += "Gostaria de solicitar um orçamento formal para os seguintes itens:\n\n";
            cart.forEach(item => {
                body += `Marca: ${item.brand}\n`;
                body += `Produto: ${item.name}\n`;
                body += `Quantidade: ${item.quantity} unidade(s)\n`;
                body += `------------------------------------\n`;
                window.ForjaDB.registerQuote(item.id, item.quantity);
            });
            body += "\nPor favor, enviem o orçamento detalhado com os valores, formas de pagamento e prazos de entrega.\n\n";
            body += "Atenciosamente,\n[Seu Nome]\n[Seu Telefone]";

            const mailtoUrl = `mailto:${companyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoUrl, '_self');
        });
    }

    // Initialize UI
    updateCartUI();
});
