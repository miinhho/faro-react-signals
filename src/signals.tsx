import {
  Children,
  cloneElement,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  useEffect,
  useRef,
} from 'react';

import { useFaroSignals } from './context';
import type {
  FaroClickSignalProps,
  FaroErrorSignalProps,
  FaroEventSignalProps,
  FaroMeasurementSignalProps,
  FaroViewSignalProps,
} from './types';
import { mergeAttributes, mergeOptions } from './utils';

/**
 * Emits a view event when the component becomes active.
 *
 * Prefer `FaroScreen` for normal page or screen views. This lower-level
 * component is useful for view-like UI that is not represented by a route.
 */
export function FaroViewSignal(props: FaroViewSignalProps): null {
  const signals = useFaroSignals();

  useSignalOnce(props.when ?? true, () => {
    signals.event(props.name, props.attributes, {
      domain: props.domain,
      options: props.options,
    });
  });

  return null;
}

/**
 * Emits a custom Faro event from declarative React state.
 */
export function FaroEventSignal(props: FaroEventSignalProps): null {
  const signals = useFaroSignals();

  useSignalOnce(props.when ?? true, () => {
    signals.event(props.name, props.attributes, {
      domain: props.domain,
      options: props.options,
    });
  });

  return null;
}

/**
 * Emits a Faro error or log entry when `when` becomes true.
 *
 * By default, Error objects use `pushError` and non-Error values use `pushLog`
 * to avoid duplicate noisy reporting.
 */
export function FaroErrorSignal({
  attributes,
  error,
  mode,
  name,
  options,
  when = Boolean(error),
}: FaroErrorSignalProps): null {
  const signals = useFaroSignals();

  useSignalOnce(when, () => {
    signals.error(name, error, attributes, options, mode);
  });

  return null;
}

/**
 * Emits a Faro measurement when `when` becomes true.
 */
export function FaroMeasurementSignal({
  attributes,
  name,
  options,
  type,
  unit,
  value,
  when = true,
}: FaroMeasurementSignalProps): null {
  const signals = useFaroSignals();

  useSignalOnce(when, () => {
    signals.measurement(
      name,
      value,
      mergeAttributes(attributes, unit ? { unit } : undefined),
      mergeOptions(options, undefined, type ? { type } : undefined)
    );
  });

  return null;
}

/**
 * Low-level click wrapper for custom events.
 *
 * For product user actions, prefer `FaroUserAction` or `withFaroUserAction`.
 */
export function FaroClickSignal({
  attributes,
  children,
  domain,
  name,
  options,
}: FaroClickSignalProps): ReactElement {
  const signals = useFaroSignals();
  const child = Children.only(children);

  if (!isValidElement<Record<string, unknown>>(child)) {
    return child;
  }

  const originalOnClick = child.props.onClick;
  const onClick = (event: MouseEvent) => {
    signals.event(name, attributes, { domain, options });

    if (typeof originalOnClick === 'function') {
      originalOnClick(event);
    }
  };

  return cloneElement(child, { onClick });
}

/**
 * Emits once while `when` is true, then arms itself again when `when` goes false.
 */
function useSignalOnce(when: boolean, emit: () => void): void {
  const emittedRef = useRef(false);
  const emitRef = useRef(emit);

  emitRef.current = emit;

  useEffect(() => {
    if (!when) {
      emittedRef.current = false;
      return;
    }

    if (emittedRef.current) {
      return;
    }

    emittedRef.current = true;
    emitRef.current();
  }, [when]);
}
