import { faro as defaultFaro } from '@grafana/faro-web-sdk';
import { createContext, type ReactElement, useCallback, useContext, useMemo } from 'react';

import type {
  FaroErrorSignalMode,
  FaroSignalAttributes,
  FaroSignalOptions,
  FaroSignalParamsProps,
  FaroSignalsContextValue,
  FaroSignalsInstance,
  FaroSignalsProviderProps,
} from './types';
import { mergeAttributes, mergeOptions, stripOption } from './utils';

const rootContext: FaroSignalsContextValue = {
  attributes: {},
  faro: defaultFaro as FaroSignalsInstance,
  now: () => Date.now(),
};

const FaroSignalsContext = createContext<FaroSignalsContextValue>(rootContext);

/**
 * Reads the current Faro signal scope.
 *
 * Most application code should use `useFaroSignals`; this lower-level hook is
 * mainly for adapter components that need inherited attributes.
 */
export function useFaroSignalsContext(): FaroSignalsContextValue {
  return useContext(FaroSignalsContext);
}

/**
 * Sets the Faro instance and root attributes for a React subtree.
 *
 * Tests can inject a mocked Faro instance here. If omitted, the package uses
 * the default Faro Web SDK singleton.
 */
export function FaroSignalsProvider({
  attributes,
  children,
  domain,
  faro,
  now,
}: FaroSignalsProviderProps): ReactElement {
  const parent = useFaroSignalsContext();
  const value = useMemo<FaroSignalsContextValue>(
    () => ({
      attributes: mergeAttributes(parent.attributes, attributes),
      domain: domain ?? parent.domain,
      faro: faro ?? parent.faro,
      now: now ?? parent.now,
    }),
    [attributes, domain, faro, now, parent]
  );

  return <FaroSignalsContext.Provider value={value}>{children}</FaroSignalsContext.Provider>;
}

/**
 * Low-level scoped attribute provider.
 *
 * `FaroParams` is the public alias; this primitive is reused by screen and
 * adapter APIs.
 */
export function FaroSignalParams({ children, domain, value }: FaroSignalParamsProps): ReactElement {
  const parent = useFaroSignalsContext();
  const nextValue = useMemo<FaroSignalsContextValue>(
    () => ({
      ...parent,
      attributes: mergeAttributes(parent.attributes, value),
      domain: domain ?? parent.domain,
    }),
    [domain, parent, value]
  );

  return <FaroSignalsContext.Provider value={nextValue}>{children}</FaroSignalsContext.Provider>;
}

/**
 * Thin React hook over Faro's public APIs.
 *
 * It merges inherited React context attributes into events, user actions, logs,
 * errors, and measurements without creating a second telemetry runtime.
 */
export function useFaroSignals() {
  const context = useFaroSignalsContext();

  const event = useCallback(
    (
      name: string,
      attributes?: FaroSignalAttributes,
      options?: { domain?: string | undefined; options?: FaroSignalOptions | undefined }
    ) => {
      context.faro?.api.pushEvent(
        name,
        mergeAttributes(context.attributes, attributes),
        options?.domain ?? context.domain,
        options?.options
      );
    },
    [context]
  );

  const userAction = useCallback(
    (name: string, attributes?: FaroSignalAttributes) => {
      const mergedAttributes = mergeAttributes(context.attributes, attributes);

      if (context.faro?.api.startUserAction) {
        context.faro.api.startUserAction(name, mergedAttributes);
        return;
      }

      // Older or mocked Faro instances may not expose `startUserAction`.
      // Falling back to a custom event keeps the signal visible without
      // emulating Faro's user-action lifecycle.
      context.faro?.api.pushEvent(name, mergedAttributes, context.domain);
    },
    [context]
  );

  const log = useCallback(
    (args: unknown[], attributes?: FaroSignalAttributes, options?: FaroSignalOptions) => {
      context.faro?.api.pushLog(
        args,
        mergeOptions(options, mergeAttributes(context.attributes, attributes))
      );
    },
    [context]
  );

  const error = useCallback(
    (
      name: string,
      sourceError: unknown,
      attributes?: FaroSignalAttributes,
      options?: FaroSignalOptions,
      mode: FaroErrorSignalMode = 'auto'
    ) => {
      const signalAttributes = mergeAttributes(context.attributes, attributes, {
        faroSignalName: name,
      });
      const pushError =
        mode === 'error' || mode === 'both' || (mode === 'auto' && sourceError instanceof Error);
      const pushLog =
        mode === 'log' || mode === 'both' || (mode === 'auto' && !(sourceError instanceof Error));

      // Default mode avoids duplicate reporting: Error objects go to pushError,
      // non-Error values become named log entries. Callers can opt into `both`.
      if (pushError && sourceError instanceof Error) {
        context.faro?.api.pushError(sourceError, mergeOptions(options, signalAttributes));
      }

      if (pushLog) {
        context.faro?.api.pushLog([name, sourceError], mergeOptions(options, signalAttributes));
      }
    },
    [context]
  );

  const measurement = useCallback(
    (
      name: string,
      value: number,
      attributes?: FaroSignalAttributes & { unit?: string },
      options?: FaroSignalOptions & { type?: string }
    ) => {
      const { unit, ...restAttributes } = attributes ?? {};
      const signalAttributes = mergeAttributes(
        context.attributes,
        restAttributes,
        unit ? { unit } : undefined
      );

      context.faro?.api.pushMeasurement(
        {
          type: typeof options?.type === 'string' ? options.type : 'faro.react.signal',
          values: {
            [name]: value,
          },
        },
        mergeOptions(stripOption(options, 'type'), signalAttributes)
      );
    },
    [context]
  );

  return useMemo(
    () => ({
      attributes: context.attributes,
      domain: context.domain,
      error,
      event,
      faro: context.faro,
      log,
      measurement,
      userAction,
    }),
    [context.attributes, context.domain, context.faro, error, event, log, measurement, userAction]
  );
}
