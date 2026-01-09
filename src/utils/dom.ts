export const prefersReducedMotion = (): boolean => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const toggleDarkMode = (): void => {
    const isBrowser =
        typeof window === 'object' &&
        typeof document === 'object' &&
        typeof window.localStorage !== 'undefined' &&
        document.documentElement !== null;

    if (isBrowser) {
        const isDarkNow = document.documentElement.classList.toggle('dark');

        try {
            localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
        } catch {
            // Silently fail in privacy mode or when storage is unavailable
        }
    }
};
