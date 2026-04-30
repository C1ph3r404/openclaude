/**
 * Parameter aliases system for tool inputs.
 *
 * This module provides utilities for normalizing tool input parameters using
 * alias mappings. It allows tools to accept alternative parameter names
 * (aliases) that get normalized to their canonical names before validation.
 *
 * Example: A tool can accept both `file_path` (canonical) and `path/filePath` (aliases).
 */

/**
 * Map of parameter aliases: canonical name → array of acceptable aliases.
 * Example: { "file_path": ["path", "filePath"], "timeout": ["timeoutMs"] }
 */
export type ParameterAliasMap = Record<string, string[]>

/**
 * Reverse mapping of aliases: alias → canonical name.
 * Built from a ParameterAliasMap for fast lookup.
 * Example: { "path": "file_path", "filePath": "file_path", "timeoutMs": "timeout" }
 */
export type ReverseAliasMap = Map<string, string>

/**
 * Builds a reverse alias map from a ParameterAliasMap.
 *
 * Validates that no alias appears in multiple canonical parameters' alias lists.
 * This prevents ambiguous situations where one alias could map to two different
 * canonical parameters.
 *
 * @param aliasMap - The parameter alias map to reverse
 * @param parameterNames - Optional set of canonical parameter names for validation
 * @returns A reverse map (alias → canonical) ready for lookups
 * @throws Error if duplicate aliases are found across different canonical parameters
 */
export function buildReverseAliasMap(
    aliasMap: ParameterAliasMap,
    parameterNames?: Set<string>,
): ReverseAliasMap {
    const reverseMap = new Map<string, string>()

    for (const [canonical, aliases] of Object.entries(aliasMap)) {
        if (!Array.isArray(aliases)) {
            continue
        }

        for (const alias of aliases) {
            if (reverseMap.has(alias)) {
                const existingCanonical = reverseMap.get(alias)
                throw new Error(
                    `Duplicate alias "${alias}" defined for both "${existingCanonical}" and "${canonical}"`,
                )
            }
            reverseMap.set(alias, canonical)
        }
    }

    return reverseMap
}

/**
 * Normalizes an input object by replacing alias keys with their canonical names.
 *
 * Mutates the input object in place. If a canonical key already exists,
 * the alias is ignored (canonical takes precedence).
 *
 * @param input - The input object to normalize (must be a record-like object)
 * @param reverseAliasMap - Map of alias → canonical name
 * @returns The normalized input (same object, mutated in place)
 */
export function normalizeAliasedInput(
    input: Record<string, unknown>,
    reverseAliasMap: ReverseAliasMap,
): Record<string, unknown> {
    if (!input || typeof input !== 'object') {
        return input
    }

    // Collect aliases to rename (can't modify during iteration)
    const toRename: Array<{ alias: string; canonical: string }> = []

    for (const [key, value] of Array.from(Object.entries(input))) {
        const canonical = reverseAliasMap.get(key)
        if (canonical && !(canonical in input)) {
            toRename.push({ alias: key, canonical })
        }
    }

    // Apply renames
    for (const { alias, canonical } of toRename) {
        input[canonical] = input[alias]
        delete input[alias]
    }

    return input
}

/**
 * Creates a preprocessing function that normalizes aliased inputs.
 *
 * Returns a function suitable for use as a Zod preprocessor.
 * The preprocessor handles non-object inputs gracefully and returns them unchanged.
 *
 * @param reverseAliasMap - Map of alias → canonical name
 * @returns A preprocessing function for Zod
 */
export function createAliasPreprocessor(
    reverseAliasMap: ReverseAliasMap,
): (input: unknown) => unknown {
    return (input: unknown) => {
        if (!input || typeof input !== 'object') {
            return input
        }

        // Work with a copy to avoid mutating the original during preprocessing
        const copy = { ...input } as Record<string, unknown>
        return normalizeAliasedInput(copy, reverseAliasMap)
    }
}
