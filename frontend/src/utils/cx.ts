import { clsx } from 'clsx';
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
export const cn = (...inputs) => twMerge(clsx(inputs));

/**
 * Alias for backwards compatibility with the original `cx` export.
 */
export const cx = cn;

/**
 * Helps sort class objects for Tailwind IntelliSense ordering.
 */
export function sortCx(classes) {
    return classes;
}
