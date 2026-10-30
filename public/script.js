const lblDashboardRevenue = document.getElementById('total-revenue');
const lblDashboardTransactions = document.getElementById('transactions');
const lblDashboardInventoryValue = document.getElementById('inventory-value');
const lblDashboardInventoryItems = document.getElementById('total-inventory');

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

let totalRevenue = null;
let transactions = null;
let totalInventoryValue = null;
let totalInventoryItems = null;

function refreshDashboard() {
    lblDashboardRevenue.textContent = `${currencyFormatter.format(totalRevenue)}`;
    lblDashboardTransactions.textContent = `${transactions}`
    lblDashboardInventoryValue.textContent = `${currencyFormatter.format(totalInventoryValue)}`
    lblDashboardInventoryItems.textContent = `${totalInventoryItems} Units Available`;
}

refreshDashboard()

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
