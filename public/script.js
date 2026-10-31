const menuToggle = document.getElementById('menu-toggle');
const sidebarNavigation = document.getElementById('sidebar-navigation');
const mobileLayout = window.matchMedia('(max-width: 900px)');
const notificationTrigger = document.getElementById('notification-trigger');
const notificationsPopover = document.createElement('section');

notificationsPopover.id = 'notifications-popover';
notificationsPopover.className = 'nav-popover notifications-popover';
notificationsPopover.setAttribute('popover', 'auto');
notificationsPopover.setAttribute('role', 'dialog');
notificationsPopover.setAttribute('aria-labelledby', 'notifications-title');
notificationsPopover.innerHTML = `
    <div class="popover-header notifications-header">
        <h2 id="notifications-title">Low stock alerts</h2>
        <button class="popover-close notifications-close" type="button" aria-label="Close low stock alerts" autofocus>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
            </svg>
        </button>
    </div>
    <div class="notifications-content">
        <div class="notifications-empty">
            <p class="notifications-empty-title">No stock alerts to display.</p>
            <p>Alerts will appear when inventory quantities are available.</p>
        </div>
    </div>
`;
document.body.append(notificationsPopover);

const settingsTrigger = document.getElementById('settings-trigger');
const settingsPopover = document.createElement('section');
settingsPopover.id = 'settings-popover';
settingsPopover.className = 'nav-popover settings-popover';
settingsPopover.setAttribute('popover', 'auto');
settingsPopover.setAttribute('role', 'dialog');
settingsPopover.setAttribute('aria-labelledby', 'settings-title');
settingsPopover.innerHTML = `
    <div class="popover-header settings-header">
        <h2 id="settings-title">Settings</h2>
        <button class="popover-close settings-close" type="button" aria-label="Close settings" autofocus>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
            </svg>
        </button>
    </div>
    <label class="theme-setting" for="dark-mode-toggle">
        <span>Dark mode</span>
        <input class="theme-toggle" id="dark-mode-toggle" type="checkbox" role="switch">
    </label>
`;
document.body.append(settingsPopover);

const darkModeToggle = document.getElementById('dark-mode-toggle');
darkModeToggle.checked = document.documentElement.dataset.theme === 'dark';
darkModeToggle.addEventListener('change', () => {
    const theme = darkModeToggle.checked ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
        localStorage.setItem('logistix-theme', theme);
    } catch {
        // The toggle still works for this page when browser storage is unavailable.
    }
    if (salesChartInstance && typeof updateSalesChartForSelectedMonth === 'function') {
        updateSalesChartForSelectedMonth();
    }
});

const navPopovers = [
    { trigger: notificationTrigger, panel: notificationsPopover },
    { trigger: settingsTrigger, panel: settingsPopover }
];

function closePopover(entry, restoreFocus = false) {
    if (!entry.panel.matches(':popover-open')) return;
    entry.panel.hidePopover();
    if (restoreFocus) entry.trigger.focus();
}

function positionPopover({ trigger, panel }) {
    const anchor = trigger.getBoundingClientRect();
    const gutter = 12;
    const width = Math.min(336, window.innerWidth - gutter * 2);
    const left = mobileLayout.matches ? anchor.left : anchor.right + 12;
    const top = mobileLayout.matches ? anchor.bottom + 8 : anchor.top;

    panel.style.left = `${Math.max(gutter, Math.min(left, window.innerWidth - width - gutter))}px`;
    panel.style.top = `${Math.max(gutter, Math.min(top, window.innerHeight - panel.offsetHeight - gutter))}px`;
}

navPopovers.forEach((entry) => {
    entry.panel.addEventListener('beforetoggle', (event) => {
        entry.trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
        if (event.newState === 'open') positionPopover(entry);
    });
    entry.panel.addEventListener('toggle', (event) => {
        if (event.newState === 'open') positionPopover(entry);
    });
    entry.panel.querySelector('.popover-close').addEventListener('click', () => {
        closePopover(entry, true);
    });
});

// Handle the top layer first so Escape does not also collapse mobile navigation.
document.addEventListener('keydown', (event) => {
    const openPopover = navPopovers.find(({ panel }) => panel.matches(':popover-open'));
    if (event.key === 'Escape' && openPopover) {
        event.preventDefault();
        event.stopPropagation();
        closePopover(openPopover, true);
    }
}, true);

function repositionOpenPopover() {
    navPopovers.forEach((entry) => {
        if (entry.panel.matches(':popover-open')) positionPopover(entry);
    });
}
window.addEventListener('resize', repositionOpenPopover);
window.addEventListener('scroll', repositionOpenPopover, true);

function setMenuExpanded(expanded) {
    if (!expanded) navPopovers.forEach((entry) => closePopover(entry));
    sidebarNavigation.hidden = !expanded;
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
}

menuToggle.addEventListener('click', () => {
    setMenuExpanded(sidebarNavigation.hidden);
});

mobileLayout.addEventListener('change', () => {
    navPopovers.forEach((entry) => closePopover(entry));
    setMenuExpanded(!mobileLayout.matches);
});

sidebarNavigation.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileLayout.matches) {
        setMenuExpanded(false);
        menuToggle.focus();
    }
});

setMenuExpanded(!mobileLayout.matches);

// Cache for products and categories to quickly populate edit/delete modals
let cachedProducts = [];
let cachedCategories = [];

// Setup action dialogs
document.querySelectorAll('dialog.action-modal').forEach((modal) => {
    let trigger;
    modal.addEventListener('dashboard:open', async (event) => {
        trigger = event.detail.trigger;
        await handleModalOpen(modal.id, trigger);
    });

    modal.querySelectorAll('[data-modal-close]').forEach((button) => {
        button.addEventListener('click', () => modal.close());
    });

    // Only dismiss when both ends of a click land on the backdrop.
    let backdropPressed = false;
    const isOutside = (event) => {
        const bounds = modal.getBoundingClientRect();
        return event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom;
    };
    modal.addEventListener('pointerdown', (event) => {
        backdropPressed = event.target === modal && isOutside(event);
    });
    modal.addEventListener('click', (event) => {
        if (backdropPressed && event.target === modal && isOutside(event)) modal.close();
        backdropPressed = false;
    });

    modal.addEventListener('close', () => {
        document.documentElement.classList.remove('modal-open');
        const form = modal.querySelector('form');
        if (form) {
            const note = modal.querySelector('.modal-note');
            if (note) note.textContent = '';
        }
        if (trigger?.isConnected) trigger.focus();
        else document.querySelector('[data-modal-target]')?.focus();
    });
});

// Global trigger listener for opening modals
document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal-target]');
    if (!trigger) return;
    const modal = document.getElementById(trigger.dataset.modalTarget);
    if (!modal) return;
    navPopovers.forEach((entry) => closePopover(entry));
    modal.dispatchEvent(new CustomEvent('dashboard:open', { detail: { trigger } }));
    modal.showModal();
    document.documentElement.classList.add('modal-open');
});

// Modal open data population
async function handleModalOpen(modalId, trigger) {
    if (modalId === 'add-item-modal') {
        const select = document.getElementById('item-category');
        const note = document.getElementById('item-category-note');
        if (select) {
            select.innerHTML = '<option value="" disabled selected>Loading categories...</option>';
            try {
                const res = await fetch('/api/categories');
                const categories = await res.json();
                cachedCategories = categories;
                if (categories.length === 0) {
                    select.innerHTML = '<option value="" disabled selected>No categories available</option>';
                    if (note) note.textContent = 'Please create a category first on the Categories page.';
                } else {
                    select.innerHTML = '<option value="" disabled selected>Select a category</option>' +
                        categories.map(c => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
                    if (note) note.textContent = '';
                }
            } catch (err) {
                select.innerHTML = '<option value="" disabled selected>Error loading categories</option>';
            }
        }
    } else if (modalId === 'create-sale-modal') {
        const select = document.getElementById('sale-product');
        const note = document.getElementById('sale-product-note');
        const priceInput = document.getElementById('sale-price');
        const catInput = document.getElementById('sale-category');
        const qtyInput = document.getElementById('sale-quantity');
        const markupInput = document.getElementById('sale-markup');
        const calcNote = document.getElementById('sale-calc-note');
        const combo = document.getElementById('sale-markup-combo');

        let selectedBasePrice = 0;

        function getMarkupPercent() {
            if (!markupInput) return 5;
            const raw = markupInput.value.replace('%', '').trim();
            const val = parseFloat(raw);
            return isNaN(val) ? 5 : val;
        }

        function updateCalc(source) {
            if (!selectedBasePrice) {
                if (priceInput) priceInput.value = '0.00';
                if (calcNote) calcNote.innerHTML = '';
                return;
            }

            let markup = getMarkupPercent();

            if (source === 'price' && priceInput) {
                const enteredPrice = parseFloat(priceInput.value) || 0;
                if (selectedBasePrice > 0) {
                    const derived = ((enteredPrice - selectedBasePrice) / selectedBasePrice) * 100;
                    markup = Math.round(derived * 100) / 100;
                    if (markupInput) markupInput.value = `${markup}%`;
                }
            } else {
                const unitPrice = Math.round(selectedBasePrice * (1 + markup / 100) * 100) / 100;
                if (priceInput) priceInput.value = unitPrice.toFixed(2);
            }

            const currentUnitPrice = parseFloat(priceInput?.value || 0);
            const qty = parseInt(qtyInput?.value || 1, 10);
            const total = Math.round(qty * currentUnitPrice * 100) / 100;
            const diff = Math.round((currentUnitPrice - selectedBasePrice) * 100) / 100;
            const sign = diff >= 0 ? '+' : '';

            if (calcNote) {
                calcNote.innerHTML = `Base value: <strong>${selectedBasePrice.toFixed(2)}</strong> ${sign}${diff.toFixed(2)} (${markup}% markup) &rarr; <strong>${currentUnitPrice.toFixed(2)}</strong>/unit &bull; Total: <strong>${total.toFixed(2)}</strong>`;
            }

            // Sync combo options styling
            if (combo) {
                const currentVal = (markupInput?.value || '').trim();
                combo.querySelectorAll('.combo-option').forEach(opt => {
                    const matches = opt.dataset.value === currentVal || opt.dataset.value === `${markup}%`;
                    opt.classList.toggle('selected', matches);
                });
            }
        }

        // Initialize / Reset modal state
        if (markupInput && !markupInput.value) markupInput.value = '5%';
        if (calcNote) calcNote.innerHTML = '';

        if (select) {
            select.innerHTML = '<option value="" disabled selected>Loading products...</option>';
            try {
                const res = await fetch('/api/products');
                const products = await res.json();
                cachedProducts = products;
                const inStock = products.filter(p => p.quantity > 0);
                if (inStock.length === 0) {
                    select.innerHTML = '<option value="" disabled selected>No products in stock</option>';
                    if (note) note.textContent = 'All products are out of stock or none have been added.';
                } else {
                    select.innerHTML = '<option value="" disabled selected>Select a product</option>' +
                        inStock.map(p => `<option value="${p._id}" data-price="${p.price}" data-category="${p.category?.name || 'General'}" data-qty="${p.quantity}">${escapeHtml(p.name)} (${p.quantity} in stock)</option>`).join('');
                    if (note) note.textContent = 'Select a product to auto-fill details.';
                }
            } catch (err) {
                select.innerHTML = '<option value="" disabled selected>Error loading products</option>';
            }

            select.onchange = () => {
                const opt = select.options[select.selectedIndex];
                if (opt && opt.dataset.price) {
                    selectedBasePrice = Number(opt.dataset.price) || 0;
                    if (catInput) catInput.value = opt.dataset.category || 'General';
                    if (qtyInput) {
                        qtyInput.max = opt.dataset.qty;
                        qtyInput.value = 1;
                    }
                    if (note) note.textContent = `Available stock: ${opt.dataset.qty}`;
                    updateCalc('select');
                } else {
                    selectedBasePrice = 0;
                    updateCalc('select');
                }
            };
        }

        if (qtyInput) {
            qtyInput.oninput = () => updateCalc('qty');
        }

        if (priceInput) {
            priceInput.oninput = () => updateCalc('price');
        }

        if (markupInput) {
            markupInput.oninput = () => updateCalc('markup');
            markupInput.onblur = () => {
                let v = markupInput.value.replace('%', '').trim();
                if (!v || isNaN(parseFloat(v))) {
                    markupInput.value = '5%';
                } else if (!markupInput.value.endsWith('%')) {
                    markupInput.value = `${v}%`;
                }
                updateCalc('markup');
            };
        }

        // Setup combo dropdown toggle & option selection
        if (combo && !combo.dataset.bound) {
            const chevron = combo.querySelector('.combo-chevron');
            const menu = combo.querySelector('.combo-menu');

            if (chevron && menu) {
                chevron.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.hidden = !menu.hidden;
                });

                menu.querySelectorAll('.combo-option').forEach(opt => {
                    opt.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (markupInput) {
                            markupInput.value = opt.dataset.value;
                            updateCalc('markup');
                        }
                        menu.hidden = true;
                    });
                });

                document.addEventListener('click', (e) => {
                    if (!combo.contains(e.target)) {
                        menu.hidden = true;
                    }
                });
            }
            combo.dataset.bound = 'true';
        }
    } else if (modalId === 'edit-inventory-modal' && trigger?.dataset.id) {
        const id = trigger.dataset.id;
        const idInput = document.getElementById('edit-item-id');
        const nameInput = document.getElementById('edit-item-name');
        const descInput = document.getElementById('edit-item-description');
        const qtyInput = document.getElementById('edit-item-quantity');
        const priceInput = document.getElementById('edit-item-price');
        const catSelect = document.getElementById('edit-item-category');

        if (idInput) idInput.value = id;

        // Populate category dropdown
        if (catSelect) {
            try {
                const catRes = await fetch('/api/categories');
                cachedCategories = await catRes.json();
                catSelect.innerHTML = cachedCategories.map(c => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
            } catch (e) {}
        }

        let product = cachedProducts.find(p => p._id === id);
        if (!product) {
            try {
                const res = await fetch(`/api/products/${id}`);
                product = await res.json();
            } catch (e) {}
        }

        if (product) {
            if (nameInput) nameInput.value = product.name || '';
            if (descInput) descInput.value = product.description || '';
            if (qtyInput) qtyInput.value = product.quantity !== undefined ? product.quantity : 0;
            if (priceInput) priceInput.value = product.price !== undefined ? product.price : 0;
            if (catSelect && product.category) {
                catSelect.value = product.category._id || product.category;
            }
        }
    } else if (modalId === 'delete-inventory-modal' && trigger?.dataset.id) {
        const id = trigger.dataset.id;
        const idInput = document.getElementById('delete-item-id');
        const nameSpan = document.getElementById('delete-item-name');
        if (idInput) idInput.value = id;
        const product = cachedProducts.find(p => p._id === id);
        if (nameSpan && product) nameSpan.textContent = product.name;
    } else if (modalId === 'edit-category-modal' && trigger?.dataset.id) {
        const id = trigger.dataset.id;
        const idInput = document.getElementById('edit-category-id');
        const nameInput = document.getElementById('edit-category-name');
        const descInput = document.getElementById('edit-category-description');

        if (idInput) idInput.value = id;
        const category = cachedCategories.find(c => c._id === id);
        if (category) {
            if (nameInput) nameInput.value = category.name || '';
            if (descInput) descInput.value = category.description || '';
        }
    } else if (modalId === 'delete-category-modal' && trigger?.dataset.id) {
        const id = trigger.dataset.id;
        const idInput = document.getElementById('delete-category-id');
        const nameSpan = document.getElementById('delete-category-name');
        if (idInput) idInput.value = id;
        const category = cachedCategories.find(c => c._id === id);
        if (nameSpan && category) nameSpan.textContent = category.name;
    }
}

// Attach Form Submit Handlers
function setupFormHandlers() {
    // 1. Add Item Form
    const addItemModal = document.getElementById('add-item-modal');
    if (addItemModal) {
        const form = addItemModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('add-item-note');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            const payload = {
                name: form.elements['name']?.value,
                description: form.elements['description']?.value,
                quantity: form.elements['quantity']?.value,
                price: form.elements['price']?.value,
                category: form.elements['category']?.value
            };

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create item');

                form.reset();
                addItemModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 2. Create Sale Form
    const createSaleModal = document.getElementById('create-sale-modal');
    if (createSaleModal) {
        const form = createSaleModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('create-sale-note');
            const submitBtn = form.querySelector('button[type="submit"]');

            const markupRaw = form.elements['markup']?.value || '5%';
            const markupVal = parseFloat(markupRaw.replace('%', '').trim());

            const payload = {
                productId: form.elements['product']?.value,
                quantity: form.elements['quantity']?.value,
                price: form.elements['price']?.value,
                markup: isNaN(markupVal) ? 5 : markupVal
            };

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch('/api/sales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to record sale');

                form.reset();
                createSaleModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 3. Edit Inventory Item Form
    const editInventoryModal = document.getElementById('edit-inventory-modal');
    if (editInventoryModal) {
        const form = editInventoryModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('edit-inventory-note');
            const id = document.getElementById('edit-item-id')?.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            const payload = {
                name: form.elements['name']?.value,
                description: form.elements['description']?.value,
                quantity: form.elements['quantity']?.value,
                price: form.elements['price']?.value,
                category: form.elements['category']?.value
            };

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch(`/api/products/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update item');

                editInventoryModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 4. Delete Inventory Item Form
    const deleteInventoryModal = document.getElementById('delete-inventory-modal');
    if (deleteInventoryModal) {
        const form = deleteInventoryModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('delete-inventory-note');
            const id = document.getElementById('delete-item-id')?.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete item');

                deleteInventoryModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 5. Create Category Form
    const createCategoryModal = document.getElementById('create-category-modal');
    if (createCategoryModal) {
        const form = createCategoryModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('create-category-note');
            const submitBtn = form.querySelector('button[type="submit"]');

            const payload = {
                name: form.elements['name']?.value,
                description: form.elements['description']?.value
            };

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create category');

                form.reset();
                createCategoryModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 6. Edit Category Form
    const editCategoryModal = document.getElementById('edit-category-modal');
    if (editCategoryModal) {
        const form = editCategoryModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('edit-category-note');
            const id = document.getElementById('edit-category-id')?.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            const payload = {
                name: form.elements['name']?.value,
                description: form.elements['description']?.value
            };

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch(`/api/categories/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update category');

                editCategoryModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 7. Delete Category Form
    const deleteCategoryModal = document.getElementById('delete-category-modal');
    if (deleteCategoryModal) {
        const form = deleteCategoryModal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('delete-category-note');
            const id = document.getElementById('delete-category-id')?.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            try {
                if (submitBtn) submitBtn.disabled = true;
                const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete category');

                deleteCategoryModal.close();
                await refreshDashboard();
            } catch (err) {
                if (note) note.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
}

// --- Data Loaders ---

// 1. Overview Page Loader
async function loadOverview() {
    const revEl = document.getElementById('total-revenue');
    const txEl = document.getElementById('transactions');
    const valEl = document.getElementById('inventory-value');
    const totInvEl = document.getElementById('total-inventory');
    const activityTbody = document.querySelector('.recent-activity-table tbody');

    if (!revEl && !activityTbody) return; // Not on overview page

    try {
        const res = await fetch('/api/overview');
        if (!res.ok) throw new Error('Failed to load overview data');
        const data = await res.json();

        if (revEl) revEl.textContent = `$${Number(data.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (txEl) txEl.textContent = Number(data.transactions || 0).toLocaleString();
        if (valEl) valEl.textContent = `$${Number(data.inventoryValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (totInvEl) totInvEl.textContent = `${Number(data.totalInventory || 0).toLocaleString()} items`;

        if (activityTbody) {
            activityTbody.innerHTML = '';
            if (!data.recentActivity || data.recentActivity.length === 0) {
                activityTbody.innerHTML = `
                    <tr>
                        <td class="table-empty" colspan="6" style="text-align: center; padding: 2rem;">
                            No recent activity to display.
                        </td>
                    </tr>
                `;
            } else {
                data.recentActivity.forEach((act) => {
                    const tr = document.createElement('tr');
                    const badgeColor = act.type === 'In' ? '#10B981' : '#EF4444';
                    tr.innerHTML = `
                        <td>${escapeHtml(act.productName)}</td>
                        <td>${escapeHtml(act.description || '—')}</td>
                        <td>${act.quantity}</td>
                        <td>${escapeHtml(act.category || 'General')}</td>
                        <td>$${Number(act.price || 0).toFixed(2)}</td>
                        <td><span style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 12px; background: ${act.type === 'In' ? '#10b98120' : '#ef444420'}; color: ${badgeColor};">${act.type}</span></td>
                    `;
                    activityTbody.appendChild(tr);
                });
            }
        }
    } catch (err) {
        console.error('Error loading overview:', err);
    }
}

let inventoryFilterInitialized = false;

function setupInventoryFilters() {
    if (inventoryFilterInitialized) return;
    const searchInput = document.getElementById('inventory-search');
    const categorySelect = document.getElementById('inventory-category-filter');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderInventoryTable();
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            renderInventoryTable();
        });
    }

    inventoryFilterInitialized = true;
}

function renderInventoryTable() {
    const tbody = document.querySelector('.inventory-table tbody');
    if (!tbody) return;

    const search = (document.getElementById('inventory-search')?.value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('inventory-category-filter')?.value || '';

    const filtered = cachedProducts.filter((product) => {
        const categoryId = String(product.category?._id || product.category || '');
        const categoryName = String(product.category?.name || 'Uncategorized');

        const matchesCategory = !categoryFilter || categoryId === categoryFilter;

        const matchesSearch = !search || (
            (product.name && product.name.toLowerCase().includes(search)) ||
            (product.description && product.description.toLowerCase().includes(search)) ||
            (categoryName && categoryName.toLowerCase().includes(search)) ||
            (product._id && product._id.toLowerCase().includes(search))
        );

        return matchesCategory && matchesSearch;
    });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        const msg = cachedProducts.length === 0
            ? 'No products found. Add products from the Overview or Inventory page.'
            : 'No products match your search or filter.';
        tbody.innerHTML = `
            <tr>
                <td class="table-empty" colspan="7" style="text-align: center; padding: 2rem;">
                    ${msg}
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach((product) => {
        const tr = document.createElement('tr');
        const categoryName = product.category?.name || 'Uncategorized';
        const price = Number(product.price || 0).toFixed(2);

        tr.innerHTML = `
            <td>${product._id.slice(-6)}</td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.description || '—')}</td>
            <td>${product.quantity}</td>
            <td>${escapeHtml(categoryName)}</td>
            <td>$${price}</td>
            <td class="inventory-row-actions">
                <button type="button" 
                        data-modal-target="edit-inventory-modal" 
                        data-id="${product._id}"
                        aria-haspopup="dialog" 
                        aria-controls="edit-inventory-modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-line preview-icon">
                        <path d="M13 21h8" />
                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                    </svg>Edit
                </button>
                <button class="delete-button" 
                        type="button" 
                        data-modal-target="delete-inventory-modal" 
                        data-id="${product._id}"
                        aria-haspopup="dialog" 
                        aria-controls="delete-inventory-modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ED372D" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash preview-icon">
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>Delete
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// 2. Inventory Page Loader
async function loadInventory() {
    const tbody = document.querySelector('.inventory-table tbody');
    if (!tbody) return;

    setupInventoryFilters();

    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch inventory');

        cachedProducts = await response.json();

        // Populate category filter dropdown if present
        const catFilter = document.getElementById('inventory-category-filter');
        if (catFilter) {
            const currentVal = catFilter.value;
            try {
                const catRes = await fetch('/api/categories');
                if (catRes.ok) {
                    const categories = await catRes.json();
                    catFilter.innerHTML = '<option value="">All Categories</option>' +
                        categories.map(c => `<option value="${c._id}" ${c._id === currentVal ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
                }
            } catch (e) {}
        }

        renderInventoryTable();
    } catch (error) {
        console.error('Error loading inventory:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--danger, #ED372D); padding: 2rem;">
                    Failed to load inventory. Please try again.
                </td>
            </tr>
        `;
    }
}

// 3. Sales Page Loader & Daily Sales Line Chart
let salesChartInstance = null;
let cachedSalesList = [];
let selectedSalesMonth = '';
let salesMonthFilterInitialized = false;

function renderDailySalesChart(dailyData, monthLabel, totalRevenue) {
    const canvas = document.getElementById('monthly-sales-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const isDark = document.documentElement.dataset.theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#ABB1BC' : '#626874';
    const accentColor = '#DCFF00';

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    if (isDark) {
        gradient.addColorStop(0, 'rgba(220, 255, 0, 0.28)');
        gradient.addColorStop(0.65, 'rgba(220, 255, 0, 0.05)');
        gradient.addColorStop(1, 'rgba(220, 255, 0, 0.0)');
    } else {
        gradient.addColorStop(0, 'rgba(220, 255, 0, 0.35)');
        gradient.addColorStop(0.65, 'rgba(220, 255, 0, 0.08)');
        gradient.addColorStop(1, 'rgba(220, 255, 0, 0.0)');
    }

    salesChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d.day),
            datasets: [
                {
                    label: 'Daily Revenue',
                    data: dailyData.map(d => d.revenue),
                    borderColor: accentColor,
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: accentColor,
                    pointBorderColor: isDark ? '#191B1E' : '#FFFFFF',
                    pointBorderWidth: 1.5,
                    pointRadius: (context) => {
                        const val = context.raw || 0;
                        return val > 0 ? 5 : 2;
                    },
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#FFFFFF',
                    pointHoverBorderColor: accentColor,
                    pointHoverBorderWidth: 2.5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#191B1E' : '#FFFFFF',
                    titleColor: isDark ? '#F4F5F7' : '#171A21',
                    bodyColor: isDark ? '#C0C5CE' : '#505661',
                    borderColor: isDark ? '#DCFF00' : 'rgba(0, 0, 0, 0.15)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    callbacks: {
                        title: function(items) {
                            if (!items.length) return '';
                            const idx = items[0].dataIndex;
                            return dailyData[idx]?.fullDateLabel || `Day ${dailyData[idx]?.day}`;
                        },
                        label: function(context) {
                            const idx = context.dataIndex;
                            const day = dailyData[idx];
                            const rev = context.parsed.y;
                            const units = day ? day.units : 0;
                            const orders = day ? day.orders : 0;
                            return [
                                ` Revenue: $${rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                ` Units Sold: ${units}`,
                                ` Orders: ${orders}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: { family: "'Geist', sans-serif", size: 11 },
                        maxTicksLimit: 16
                    }
                },
                y: {
                    min: 0,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: { family: "'Geist', sans-serif", size: 11 },
                        callback: function(val) {
                            if (val >= 1000) return '$' + (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'k';
                            return '$' + val;
                        }
                    }
                }
            }
        }
    });
}

function updateSalesChartForSelectedMonth() {
    if (!selectedSalesMonth) return;

    const [yearStr, monthStr] = selectedSalesMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[monthIndex] || 'Selected Month';
    const shortMonth = monthNamesShort[monthIndex] || '';

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dailyData = [];

    for (let d = 1; d <= daysInMonth; d++) {
        dailyData.push({
            day: d,
            fullDateLabel: `${shortMonth} ${d}, ${year}`,
            revenue: 0,
            units: 0,
            orders: 0
        });
    }

    let monthRevenue = 0;
    cachedSalesList.forEach(sale => {
        const saleDate = new Date(sale.createdAt || Date.now());
        const key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        if (key === selectedSalesMonth) {
            const dayNum = saleDate.getDate();
            if (dayNum >= 1 && dayNum <= daysInMonth) {
                const rev = Number(sale.total || (sale.price * sale.quantity) || 0);
                const qty = Number(sale.quantity || 1);
                dailyData[dayNum - 1].revenue += rev;
                dailyData[dayNum - 1].units += qty;
                dailyData[dayNum - 1].orders += 1;
                monthRevenue += rev;
            }
        }
    });

    const subtitleEl = document.getElementById('sales-chart-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `Daily sales trajectory for ${monthName} ${year}`;
    }

    const badgeEl = document.getElementById('chart-month-total') || document.getElementById('chart-annual-total');
    if (badgeEl) {
        badgeEl.textContent = `Month Total: $${monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    renderDailySalesChart(dailyData, `${monthName} ${year}`, monthRevenue);
}

async function loadSales() {
    const tbody = document.querySelector('.sales-table tbody');
    const chartCanvas = document.getElementById('monthly-sales-chart');
    if (!tbody && !chartCanvas) return;

    try {
        const res = await fetch('/api/sales');
        if (!res.ok) throw new Error('Failed to fetch sales');
        const sales = await res.json();
        cachedSalesList = sales;

        // 1. Calculate Overall KPIs
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let totalRevenue = 0;
        let totalUnits = 0;
        let thisMonthRevenue = 0;

        sales.forEach(sale => {
            const rev = Number(sale.total || (sale.price * sale.quantity) || 0);
            const qty = Number(sale.quantity || 1);
            totalRevenue += rev;
            totalUnits += qty;

            const saleDate = new Date(sale.createdAt || Date.now());
            const saleKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
            if (saleKey === currentMonthKey) {
                thisMonthRevenue += rev;
            }
        });

        // 2. Update KPI Cards
        const totalRevEl = document.getElementById('sales-total-revenue');
        const thisMonthEl = document.getElementById('sales-this-month');
        const itemsSoldEl = document.getElementById('sales-items-sold');
        const avgOrderEl = document.getElementById('sales-avg-order');
        const totalOrdersEl = document.getElementById('sales-total-orders');

        if (totalRevEl) totalRevEl.textContent = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (thisMonthEl) thisMonthEl.textContent = `$${thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month`;
        if (itemsSoldEl) itemsSoldEl.textContent = totalUnits.toLocaleString();
        if (avgOrderEl) {
            const avg = sales.length > 0 ? totalRevenue / sales.length : 0;
            avgOrderEl.textContent = `$${avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (totalOrdersEl) totalOrdersEl.textContent = `${sales.length} transaction${sales.length === 1 ? '' : 's'}`;

        // 3. Month Dropdown Setup & Daily Sales Line Chart
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const availableMonths = new Map();

        // Past 12 months in descending order (most recent first)
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            availableMonths.set(key, label);
        }

        // Include any sales outside standard 12 months
        sales.forEach(sale => {
            const d = new Date(sale.createdAt || Date.now());
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!availableMonths.has(key)) {
                availableMonths.set(key, `${monthNames[d.getMonth()]} ${d.getFullYear()}`);
            }
        });

        const monthSelect = document.getElementById('sales-month-select');
        if (monthSelect) {
            const currentSelected = selectedSalesMonth || monthSelect.value;
            selectedSalesMonth = availableMonths.has(currentSelected)
                ? currentSelected
                : (availableMonths.has(currentMonthKey) ? currentMonthKey : Array.from(availableMonths.keys())[0]);

            monthSelect.innerHTML = Array.from(availableMonths.entries()).map(([k, label]) => {
                return `<option value="${k}" ${k === selectedSalesMonth ? 'selected' : ''}>${label}</option>`;
            }).join('');

            if (!salesMonthFilterInitialized) {
                monthSelect.addEventListener('change', () => {
                    selectedSalesMonth = monthSelect.value;
                    updateSalesChartForSelectedMonth();
                });
                salesMonthFilterInitialized = true;
            }
        } else if (!selectedSalesMonth) {
            selectedSalesMonth = currentMonthKey;
        }

        updateSalesChartForSelectedMonth();

        // 4. Populate Sales Table
        if (tbody) {
            tbody.innerHTML = '';

            if (sales.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td class="table-empty" colspan="5" style="text-align: center; padding: 2rem;">
                            No sales recorded yet. Create a sale from the Overview page.
                        </td>
                    </tr>
                `;
                return;
            }

            sales.forEach((sale) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(sale.productName || sale.product?.name || 'Product')}</td>
                    <td>${sale.quantity}</td>
                    <td>${escapeHtml(sale.categoryName || 'General')}</td>
                    <td>$${Number(sale.price || 0).toFixed(2)}</td>
                    <td>$${Number(sale.total || 0).toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Error loading sales:', err);
    }
}

// 4. Categories Page Loader
async function loadCategories() {
    const tbody = document.querySelector('.categories-table tbody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const categories = await res.json();
        cachedCategories = categories;
        tbody.innerHTML = '';

        if (categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td class="table-empty" colspan="4" style="text-align: center; padding: 2rem;">
                        No categories found. Click "Create category" above.
                    </td>
                </tr>
            `;
            return;
        }

        categories.forEach((cat) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(cat.name)}</td>
                <td>${escapeHtml(cat.description || '—')}</td>
                <td>${cat.itemCount || 0}</td>
                <td class="inventory-row-actions">
                    <button type="button" 
                            data-modal-target="edit-category-modal" 
                            data-id="${cat._id}"
                            aria-haspopup="dialog" 
                            aria-controls="edit-category-modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-line preview-icon">
                            <path d="M13 21h8" />
                            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                        </svg>Edit
                    </button>
                    <button class="delete-button" 
                            type="button" 
                            data-modal-target="delete-category-modal" 
                            data-id="${cat._id}"
                            aria-haspopup="dialog" 
                            aria-controls="delete-category-modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ED372D" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash preview-icon">
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// 5. Notifications Popover Loader (Low Stock Alerts)
async function loadNotifications() {
    const content = notificationsPopover.querySelector('.notifications-content');
    if (!content) return;

    try {
        const res = await fetch('/api/products');
        if (!res.ok) return;
        const products = await res.json();
        const lowStock = products.filter(p => Number(p.quantity) <= 5);

        if (lowStock.length === 0) {
            content.innerHTML = `
                <div class="notifications-empty">
                    <p class="notifications-empty-title">No stock alerts to display.</p>
                    <p>All items have sufficient inventory.</p>
                </div>
            `;
            notificationTrigger.classList.remove('has-alerts');
        } else {
            notificationTrigger.classList.add('has-alerts');
            content.innerHTML = lowStock.map(p => `
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border, #e5e5e5); font-size: 13px;">
                    <div style="font-weight: 600; color: var(--ink); margin-bottom: 2px;">${escapeHtml(p.name)}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; color: var(--muted, #737373);">
                        <span>Category: ${escapeHtml(p.category?.name || 'General')}</span>
                        <strong style="color: ${p.quantity === 0 ? '#ED372D' : '#F59E0B'};">
                            ${p.quantity === 0 ? 'Out of stock' : `${p.quantity} left in stock`}
                        </strong>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

// Refresh all sections
async function refreshDashboard() {
    await Promise.all([
        loadOverview(),
        loadInventory(),
        loadSales(),
        loadCategories(),
        loadNotifications()
    ]);
}

// Helper: Escape HTML strings
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Initialize on DOM Ready
function init() {
    setupFormHandlers();
    refreshDashboard();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
