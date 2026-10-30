const revenueElement = document.getElementById('total-revenue');
const transactionsElement = document.getElementById('transactions');
const inventoryValueElement = document.getElementById('inventory-value');
const inventoryUnitsElement = document.getElementById('total-inventory');

let totalRevenue = 10250.90;
let transactions = 156;
let totalInventoryValue = 18722.76;
let totalInventoryItems = 384;

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function refreshValues() {
    revenueElement.textContent = `${currencyFormatter.format(totalRevenue)}`;
    transactionsElement.textContent = `${transactions}`
    inventoryValueElement.textContent = `${currencyFormatter.format(totalInventoryValue)}`
    inventoryUnitsElement.textContent = `${totalInventoryItems} Units Available`;
}

refreshValues();

const menuToggle = document.getElementById('menu-toggle');
const sidebarNavigation = document.getElementById('sidebar-navigation');
const mobileLayout = window.matchMedia('(max-width: 900px)');

function setMenuExpanded(expanded) {
    sidebarNavigation.hidden = !expanded;
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
}

menuToggle.addEventListener('click', () => {
    setMenuExpanded(sidebarNavigation.hidden);
});

// Keep desktop navigation visible; start collapsed when entering mobile layout.
mobileLayout.addEventListener('change', () => {
    setMenuExpanded(!mobileLayout.matches);
});

sidebarNavigation.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileLayout.matches) {
        setMenuExpanded(false);
        menuToggle.focus();
    }
});

setMenuExpanded(!mobileLayout.matches);
