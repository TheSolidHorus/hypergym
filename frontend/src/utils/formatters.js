/**
 * Utility functions for formatting data in the HyperGym app
 */

/**
 * Format seconds into MM:SS format
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string "MM:SS"
 */
export const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

/**
 * Format date relative to now ("2h fa", "3g fa", etc.)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted relative time
 */
export const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
};

/**
 * Format weight with unit
 * @param {number} kg - Weight in kilograms
 * @returns {string} Formatted weight "XX kg"
 */
export const formatWeight = (kg) => {
    return `${kg} kg`;
};

/**
 * Format date to Italian locale short format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date "gg/mm/aaaa"
 */
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('it-IT');
};
