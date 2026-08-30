(function () {
    const STORAGE_KEY = 'myweb-theme-mode';
    const root = document.documentElement;
    const lightThemeColor = '#a1c4fd';
    const darkThemeColor = '#0b1220';
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function readMode() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
        } catch (error) {
            return 'auto';
        }
    }

    function writeMode(mode) {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function resolveTheme(mode) {
        if (mode === 'dark' || mode === 'light') {
            return mode;
        }

        return mediaQuery.matches ? 'dark' : 'light';
    }

    function setThemeColor(theme) {
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
            meta.content = theme === 'dark' ? darkThemeColor : lightThemeColor;
        });
    }

    function syncButtons(mode) {
        document.querySelectorAll('[data-theme-option]').forEach(button => {
            const active = button.dataset.themeOption === mode;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function applyTheme(mode) {
        const safeMode = mode === 'light' || mode === 'dark' ? mode : 'auto';
        const theme = resolveTheme(safeMode);

        root.dataset.themeMode = safeMode;
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        setThemeColor(theme);
        syncButtons(safeMode);
    }

    function initButtons() {
        document.querySelectorAll('[data-theme-option]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                const mode = button.dataset.themeOption;
                if (mode === 'light' || mode === 'dark' || mode === 'auto') {
                    writeMode(mode);
                    applyTheme(mode);
                }
            });
        });
    }

    function init() {
        applyTheme(readMode());
        initButtons();
    }

    applyTheme(readMode());

    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', () => {
            if (readMode() === 'auto') {
                applyTheme('auto');
            }
        });
    } else if (mediaQuery.addListener) {
        mediaQuery.addListener(() => {
            if (readMode() === 'auto') {
                applyTheme('auto');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
