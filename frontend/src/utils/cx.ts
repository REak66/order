import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            text: ['display-xs', 'display-sm', 'display-md', 'display-lg', 'display-xl', 'display-2xl'],
        },
    },
});

/**
 * Merge Tailwind CSS class names, resolving conflicts with tailwind-merge
 * and accepting conditional classes via clsx.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

/**
 * Alias for backwards compatibility with the original `cx` export.
 */
export const cx = cn;

/**
 * Helps sort class objects for Tailwind IntelliSense ordering.
 */
export function sortCx<T extends Record<string, string | number | Record<string, string | number | Record<string, string | number>>>>(classes: T): T {
    return classes;
}

