(() => {
    let theme = 'light';
    try {
        if (localStorage.getItem('logistix-theme') === 'dark') theme = 'dark';
    } catch {
        // Keep the default when browser storage is unavailable.
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
})();
