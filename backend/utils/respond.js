/**
 * Standardised JSON response helpers.
 * Keep controllers concise — one call instead of a 4-line object literal.
 *
 * Usage:
 *   return ok(res, { data: patient });
 *   return badRequest(res, "Name is required");
 *   return serverError(res, "Unable to fetch patients");
 */

export const ok = (res, payload = {}) =>
    res.status(200).json({ success: true, ...payload });

export const created = (res, payload = {}) =>
    res.status(201).json({ success: true, ...payload });

export const badRequest = (res, message) =>
    res.status(400).json({ success: false, message });

export const unauthorized = (res, message = "Unauthorized") =>
    res.status(401).json({ success: false, message });

export const forbidden = (res, message = "Access denied.") =>
    res.status(403).json({ success: false, message });

export const notFound = (res, message) =>
    res.status(404).json({ success: false, message });

export const conflict = (res, message) =>
    res.status(409).json({ success: false, message });

export const serverError = (res, message = "An unexpected error occurred.") =>
    res.status(500).json({ success: false, message });
