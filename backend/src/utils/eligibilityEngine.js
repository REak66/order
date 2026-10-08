const Holiday = require('../models/Holiday');
const Setting = require('../models/Setting');
const {
    toLocalIsoDate,
    addDays,
    toOrderInputDate,
    getDayOfWeek
} = require('./dateUtils');

const getSettingValue = async (key, defaultValue = '') => {
    try {
        const row = await Setting.findOne({ key });
        return row?.value !== undefined && row?.value !== null && row?.value !== '' ? row.value : defaultValue;
    } catch {
        return defaultValue;
    }
};

/**
 * Validates eligibility of a target date for lunch ordering by a user.
 *
 * @param {Object} options
 * @param {string} options.targetDate - ISO date string 'YYYY-MM-DD'
 * @param {Object} options.user - User document/object (must contain .is_standby, optional .branch)
 * @param {boolean} [options.isAdminOverride=false] - Whether admin override is active
 * @param {boolean} [options.ignorePastCheck=false] - If true, bypasses past date check
 * @returns {Promise<{
 *   eligible: boolean,
 *   reason?: string,
 *   message?: string,
 *   isHoliday?: boolean,
 *   holidayName?: string,
 *   holiday?: Object,
 *   isWeekend?: boolean
 * }>}
 */
const checkDateEligibility = async ({
    targetDate,
    user = {},
    isAdminOverride = false,
    ignorePastCheck = false
}) => {
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        return {
            eligible: false,
            reason: 'invalid_date_format',
            message: 'ទម្រង់កាលបរិច្ឆេទមិនត្រឹមត្រូវ (Invalid date format)'
        };
    }

    const today = toLocalIsoDate(new Date());

    // 1. Past date check
    if (!ignorePastCheck && targetDate < today) {
        return {
            eligible: false,
            reason: 'past_date',
            message: `មិនអាចកម្មង់កាលបរិច្ឆេទកន្លងផុត (${toOrderInputDate(targetDate)}) បានទេ`
        };
    }

    // If target date is today, orders can only be placed if within today's ordering schedule
    // (Normally lunch orders are for tomorrow or future days).
    if (!ignorePastCheck && targetDate === today && !isAdminOverride) {
        // Can be handled by ordering hours or allowed
    }

    // 2. Ordering horizon / Max Advance Days or Date Range check
    const horizonMode = await getSettingValue('order_horizon_mode', 'rolling');
    if (horizonMode === 'date_range') {
        const rangeStart = await getSettingValue('order_range_start_date', '');
        const rangeEnd = await getSettingValue('order_range_end_date', '');
        if (rangeStart && rangeEnd && !isAdminOverride) {
            if (targetDate < rangeStart || targetDate > rangeEnd) {
                return {
                    eligible: false,
                    reason: 'outside_date_range',
                    message: `កាលបរិច្ឆេទ ${toOrderInputDate(targetDate)} មិនស្ថិតក្នុងចន្លោះពេលអនុញ្ញាតឱ្យកម្មង់ (${rangeStart} ដល់ ${rangeEnd}) ទេ`
                };
            }
        }
    } else {
        const maxAdvanceDaysStr = await getSettingValue('max_advance_days', '7');
        const maxAdvanceDays = parseInt(maxAdvanceDaysStr, 10) || 7;
        const maxAllowedDate = toLocalIsoDate(addDays(new Date(), maxAdvanceDays));

        if (!isAdminOverride && targetDate > maxAllowedDate) {
            return {
                eligible: false,
                reason: 'exceeds_horizon',
                message: `កាលបរិច្ឆេទ ${toOrderInputDate(targetDate)} មិនទាន់បើកឱ្យកម្មង់នៅឡើយទេ (អនុញ្ញាតត្រឹម ${maxAdvanceDays} ថ្ងៃទុកជាមុន)`
            };
        }
    }

    // 3. Weekend Check: Saturday is a normal working day; Sunday is the only weekend day
    const dayOfWeek = getDayOfWeek(targetDate);
    const isSunday = dayOfWeek === 0;
    const isWeekend = isSunday; // Saturday (dayOfWeek === 6) is a normal working day for all branches

    if (!isAdminOverride && isSunday) {
        const allowWeekendsStr = await getSettingValue('allow_weekend_orders', 'false');
        const allowWeekends = allowWeekendsStr === 'true';

        // Unless weekend orders are globally enabled for all branches, check allowed Sunday branches
        if (!allowWeekends) {
            const sundayBranchesStr = await getSettingValue('sunday_order_branches', 'BYD 60M');
            let allowedBranches = [];
            try {
                if (sundayBranchesStr.startsWith('[')) {
                    allowedBranches = JSON.parse(sundayBranchesStr);
                } else {
                    allowedBranches = sundayBranchesStr.split(',').map(s => s.trim()).filter(Boolean);
                }
            } catch {
                allowedBranches = [sundayBranchesStr.trim()];
            }

            if (allowedBranches.length === 0) {
                allowedBranches = ['BYD 60M'];
            }

            const userBranch = user?.branch ? String(user.branch).trim() : '';
            const isBranchAllowed = allowedBranches.some(b => {
                const normB = b.toLowerCase().replace(/\s+/g, '');
                const normUser = userBranch.toLowerCase().replace(/\s+/g, '');
                return normB === normUser || (normB === 'byd60m' && /60m/i.test(normUser));
            });

            if (!isBranchAllowed) {
                const allowedList = allowedBranches.join(', ');
                return {
                    eligible: false,
                    reason: 'sunday_60m_only',
                    allowedBranches,
                    isWeekend: true,
                    message: `ថ្ងៃទី ${toOrderInputDate(targetDate)} គឺ ថ្ងៃអាទិត្យ (Sunday) អនុញ្ញាតឱ្យកម្មង់បានតែបុគ្គលិកសាខា ${allowedList} ប៉ុណ្ណោះ`
                };
            }
        }
    }

    // 4. Public Holiday Check
    const holiday = await Holiday.findOne({ date: targetDate, is_active: true });
    if (holiday) {
        const isStandby = Boolean(user && user.is_standby);

        if (!isStandby && !isAdminOverride) {
            return {
                eligible: false,
                reason: 'holiday_standby_only',
                isHoliday: true,
                holidayName: holiday.name,
                holiday,
                message: `ថ្ងៃទី ${toOrderInputDate(targetDate)} គឺ ${holiday.name} (ថ្ងៃឈប់សម្រាកបុណ្យជាតិ)។ មានតែបុគ្គលិក Standby ប៉ុណ្ណោះដែលអាចបញ្ជាទិញបាន។`
            };
        }

        return {
            eligible: true,
            isHoliday: true,
            holidayName: holiday.name,
            holiday,
            isWeekend,
            message: `ថ្ងៃទី ${toOrderInputDate(targetDate)} គឺ ${holiday.name} (បុគ្គលិក Standby ត្រូវបានអនុញ្ញាត)`
        };
    }

    // 5. Normal Working Day
    return {
        eligible: true,
        isHoliday: false,
        isWeekend,
        message: 'អាចបញ្ជាទិញបាន (Eligible to order)'
    };
};

module.exports = {
    checkDateEligibility,
    getDayOfWeek,
    getSettingValue,
    toLocalIsoDate,
    addDays,
    toOrderInputDate
};
