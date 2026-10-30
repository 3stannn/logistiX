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
