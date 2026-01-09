const IMAGE_BREAKPOINTS = {
    sm: 640, // Mobile
    md: 768, // Tablet
    lg: 1024, // Small desktop
    xl: 1280, // Desktop
    '2xl': 1536, // Large desktop
} as const;

export const getResponsiveSizes = (sizes?: string): string => {
    return (
        sizes ||
        `(max-width: ${IMAGE_BREAKPOINTS.sm}px) 100vw, (max-width: ${IMAGE_BREAKPOINTS.md}px) 90vw, (max-width: ${IMAGE_BREAKPOINTS.lg}px) 80vw, 1200px`
    );
};
