import React from 'react';

interface LogoProps {
    className?: string;
    alt?: string;
    /**
     * When true, uses the theme context to determine logo color.
     * When false or not provided, uses CSS dark: classes for theming.
     * Use isDark prop for components that have their own theme state.
     */
    isDark?: boolean;
}

/**
 * Theme-aware Logo component.
 * - Light mode: Black logo (/logo-black.png)
 * - Dark mode: White logo (/logo-white.png)
 * 
 * Usage:
 * 1. With CSS classes (recommended for most cases):
 *    <Logo className="w-8 h-8" />
 * 
 * 2. With explicit isDark prop (for components with their own theme state):
 *    <Logo className="w-8 h-8" isDark={isDark} />
 */
const Logo: React.FC<LogoProps> = ({ className = '', alt = 'InterviewXpert Logo', isDark }) => {
    // If isDark is explicitly provided, use it to determine which logo to show
    if (typeof isDark === 'boolean') {
        return (
            <img
                src={isDark ? '/logo-white.png' : '/logo-black.png'}
                alt={alt}
                className={`object-contain ${className}`}
            />
        );
    }

    // Otherwise, use CSS classes for theme switching
    // This works with the Tailwind dark: class approach
    return (
        <>
            {/* Light mode logo - black */}
            <img
                src="/logo-black.png"
                alt={alt}
                className={`object-contain dark:hidden ${className}`}
            />
            {/* Dark mode logo - white */}
            <img
                src="/logo-white.png"
                alt={alt}
                className={`object-contain hidden dark:block ${className}`}
            />
        </>
    );
};

export default Logo;
