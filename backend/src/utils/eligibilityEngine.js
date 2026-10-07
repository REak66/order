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

    // 3. Weekend Check (Sat = 6, Sun = 0)
    const allowWeekendsStr = await getSettingValue('allow_weekend_orders', 'false');
    const allowWeekends = allowWeekendsStr === 'true';
    const dayOfWeek = getDayOfWeek(targetDate);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isAdminOverride && isWeekend && !allowWeekends) {
        const dayLabel = dayOfWeek === 0 ? 'ថ្ងៃអាទិត្យ (Sunday)' : 'ថ្ងៃសៅរ៍ (Saturday)';
        return {
            eligible: false,
            reason: 'weekend_closed',
            isWeekend: true,
            message: `ថ្ងៃទី ${toOrderInputDate(targetDate)} គឺ ${dayLabel} ជាថ្ងៃឈប់សម្រាកចុងសប្តាហ៍ មិនមានការកម្មង់អាហារទេ`
        };
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
