const menuToggle = document.getElementById('menu-toggle');
const sidebarNavigation = document.getElementById('sidebar-navigation');
const mobileLayout = window.matchMedia('(max-width: 900px)');
const notificationTrigger = document.getElementById('notification-trigger');
const notificationsPopover = document.createElement('section');

notificationsPopover.id = 'notifications-popover';
notificationsPopover.className = 'notifications-popover';
notificationsPopover.setAttribute('popover', 'auto');
notificationsPopover.setAttribute('role', 'dialog');
notificationsPopover.setAttribute('aria-labelledby', 'notifications-title');
notificationsPopover.innerHTML = `
    <div class="notifications-header">
        <h2 id="notifications-title">Low stock alerts</h2>
        <button class="notifications-close" type="button" aria-label="Close low stock alerts" autofocus>
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

function closeNotifications(restoreFocus = false) {
    if (!notificationsPopover.matches(':popover-open')) return;
    notificationsPopover.hidePopover();
    if (restoreFocus) notificationTrigger.focus();
}

function positionNotifications() {
    const trigger = notificationTrigger.getBoundingClientRect();
    const gutter = 12;
    const width = Math.min(336, window.innerWidth - gutter * 2);
    const left = mobileLayout.matches ? trigger.left : trigger.right + 12;
    const top = mobileLayout.matches ? trigger.bottom + 8 : trigger.top;

    notificationsPopover.style.left = `${Math.max(gutter, Math.min(left, window.innerWidth - width - gutter))}px`;
    notificationsPopover.style.top = `${Math.max(gutter, Math.min(top, window.innerHeight - notificationsPopover.offsetHeight - gutter))}px`;
}

notificationsPopover.addEventListener('beforetoggle', (event) => {
    notificationTrigger.setAttribute('aria-expanded', String(event.newState === 'open'));
    if (event.newState === 'open') positionNotifications();
});

notificationsPopover.addEventListener('toggle', (event) => {
    if (event.newState === 'open') positionNotifications();
});

notificationsPopover.querySelector('.notifications-close').addEventListener('click', () => {
    closeNotifications(true);
});

// Handle the top layer first so Escape does not also collapse mobile navigation.
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && notificationsPopover.matches(':popover-open')) {
        event.preventDefault();
        event.stopPropagation();
        closeNotifications(true);
    }
}, true);

window.addEventListener('resize', () => {
    if (notificationsPopover.matches(':popover-open')) positionNotifications();
});

window.addEventListener('scroll', () => {
    if (notificationsPopover.matches(':popover-open')) positionNotifications();
}, true);

function setMenuExpanded(expanded) {
    if (!expanded) closeNotifications();
    sidebarNavigation.hidden = !expanded;
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
}

menuToggle.addEventListener('click', () => {
    setMenuExpanded(sidebarNavigation.hidden);
});

mobileLayout.addEventListener('change', () => {
    closeNotifications();
    setMenuExpanded(!mobileLayout.matches);
});

sidebarNavigation.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileLayout.matches) {
        setMenuExpanded(false);
        menuToggle.focus();
    }
});

setMenuExpanded(!mobileLayout.matches);
