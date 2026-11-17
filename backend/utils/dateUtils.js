/**
 * Returns today's date as YYYY-MM-DD in Indian Standard Time (IST).
 * Used wherever the app needs to compare against "today".
 */
export const getTodayIST = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/**
 * Returns true if value is a valid YYYY-MM-DD calendar date string.
 */
export const isValidDate = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

/**
 * Returns true if value is a valid HH:MM 24-hour time string.
 */
export const isValidTime = (value) =>
    typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
