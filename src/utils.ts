import type { FaroSignalAttributes, FaroSignalOptions } from './types';

/**
 * Merges Faro attributes while dropping undefined values.
 *
 * Faro Web SDK event attributes are string-only, so callers should stringify
 * booleans or numbers before they reach this helper.
 */
export function mergeAttributes(
  ...items: Array<FaroSignalAttributes | undefined>
): FaroSignalAttributes {
  const merged: FaroSignalAttributes = {};

  for (const item of items) {
    if (!item) {
      continue;
    }

    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

/**
 * Creates a one-field attribute map only when the value exists.
 */
export function optionalAttribute(
  key: string,
  value: string | undefined
): FaroSignalAttributes | undefined {
  return value === undefined ? undefined : { [key]: value };
}

/**
 * Merges Faro options while preserving an existing `options.context` object.
 */
export function mergeOptions(
  options?: FaroSignalOptions,
  context?: FaroSignalAttributes,
  extras?: FaroSignalOptions
): FaroSignalOptions {
  return {
    ...options,
    ...extras,
    context: mergeAttributes(readContext(options), context),
  };
}

/**
 * Removes an internal option before forwarding the rest to Faro.
 */
export function stripOption(
  options: FaroSignalOptions | undefined,
  key: string
): FaroSignalOptions | undefined {
  if (!options || !(key in options)) {
    return options;
  }

  const { [key]: _removed, ...rest } = options;
  return rest;
}

/**
 * Reads user-provided Faro option context if it is a plain object.
 */
function readContext(options?: FaroSignalOptions): FaroSignalAttributes | undefined {
  if (!options || typeof options.context !== 'object' || options.context === null) {
    return undefined;
  }

  if (Array.isArray(options.context)) {
    return undefined;
  }

  return options.context as FaroSignalAttributes;
}
