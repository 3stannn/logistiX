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
    <div class="notifications-empty">
        <p class="notifications-empty-title">No stock alerts to display.</p>
        <p>Alerts will appear when inventory quantities are available.</p>
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
