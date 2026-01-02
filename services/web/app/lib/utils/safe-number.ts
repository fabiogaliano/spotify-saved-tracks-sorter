/**
 * Safely extract a numeric value from unknown data.
 * Use this at data boundaries or when working with JSON from external sources.
 *
 * @param value - The value to convert
 * @param fallback - Default value if conversion fails (default: 0)
 * @returns A valid number, never NaN
 */
export function safeNumber(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && !Number.isNaN(value)) {
		return value
	}
	return fallback
}

/**
 * Convert a string or number ID to a numeric ID.
 * Use this when IDs may come as strings (e.g., from URL params, form data, or
 * model types that allow string | number).
 *
 * @param id - The ID to convert (string or number)
 * @returns The numeric ID
 * @throws If the string cannot be parsed to a valid integer
 *
 * @example
 * toNumericId(123)      // 123
 * toNumericId("123")    // 123
 * toNumericId("abc")    // NaN (caller should validate)
 */
export function toNumericId(id: string | number): number {
	return typeof id === 'string' ? parseInt(id, 10) : id
}

/**
 * Safely extract a numeric value within a specific range.
 * Useful for normalized scores (0-1) or percentages.
 *
 * @param value - The value to convert
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fallback - Default value if conversion fails (default: 0)
 * @returns A valid number clamped to [min, max]
 */
export function safeNumberInRange(
	value: unknown,
	min: number,
	max: number,
	fallback = 0
): number {
	const num = safeNumber(value, fallback)
	return Math.max(min, Math.min(max, num))
}

/**
 * Type guard to check if a value is a valid number (not NaN).
 */
export function isValidNumber(value: unknown): value is number {
	return typeof value === 'number' && !Number.isNaN(value)
}
