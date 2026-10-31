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
                    if (priceInput) priceInput.value = Number(opt.dataset.price).toFixed(2);
                    if (catInput) catInput.value = opt.dataset.category || 'General';
                    if (qtyInput) {
                        qtyInput.max = opt.dataset.qty;
                        qtyInput.value = 1;
                    }
                    if (note) note.textContent = `Available stock: ${opt.dataset.qty}`;
                }
            };
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

            const payload = {
                productId: form.elements['product']?.value,
                quantity: form.elements['quantity']?.value,
                price: form.elements['price']?.value
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

// 3. Sales Page Loader
async function loadSales() {
    const tbody = document.querySelector('.sales-table tbody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/sales');
        if (!res.ok) throw new Error('Failed to fetch sales');
        const sales = await res.json();
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
