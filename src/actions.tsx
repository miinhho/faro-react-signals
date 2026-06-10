import {
  Children,
  type ComponentType,
  cloneElement,
  isValidElement,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { FaroSignalParams, useFaroSignals } from './context';
import type {
  FaroParamsProps,
  FaroScreenProps,
  FaroSignalAttributes,
  FaroUserActionHandle,
  FaroUserActionInjectedProps,
  FaroUserActionProps,
  UseFaroUserActionOptions,
  WithFaroUserActionComponent,
  WithFaroUserActionOptions,
} from './types';
import { mergeAttributes, optionalAttribute } from './utils';

/**
 * Provides scoped Faro attributes for all nested signals.
 *
 * Use this when the scope is not necessarily a screen, for example a checkout
 * step, modal, or product surface.
 */
export function FaroParams(props: FaroParamsProps): ReactElement {
  return <FaroSignalParams {...props} />;
}

/**
 * Declares a screen-level Faro scope.
 *
 * Emits a `<screen>.viewed` event by default and provides stable screen
 * attributes to nested user actions and custom signals.
 */
export function FaroScreen({
  attributes,
  children,
  domain,
  name,
  routeTemplate,
  title,
  trackView = true,
}: FaroScreenProps): ReactElement {
  const signals = useFaroSignals();
  const screenAttributes = useMemo(
    () =>
      mergeAttributes(
        attributes,
        { screenName: name },
        optionalAttribute('routeTemplate', routeTemplate),
        optionalAttribute('screenTitle', title)
      ),
    [attributes, name, routeTemplate, title]
  );

  useEffect(() => {
    if (trackView) {
      signals.event(`${name}.viewed`, screenAttributes, { domain });
    }
  }, [domain, name, screenAttributes, signals, trackView]);

  return (
    <FaroSignalParams domain={domain} value={screenAttributes}>
      {children}
    </FaroSignalParams>
  );
}

/**
 * Creates a user-action helper for manual handler wiring.
 *
 * This is the compatibility escape hatch for components that do not accept a
 * normal `onClick` prop or cannot be safely wrapped with `cloneElement`.
 */
export function useFaroUserAction({
  attributes,
  faroActionName,
  faroContext,
  name,
}: UseFaroUserActionOptions): FaroUserActionHandle {
  const signals = useFaroSignals();
  const actionName = faroActionName ?? name;

  if (!actionName) {
    throw new Error('A Faro user action requires a name or faroActionName.');
  }

  const actionAttributes = mergeAttributes(signals.attributes, attributes, faroContext);
  const track = useCallback(
    (extraAttributes?: FaroSignalAttributes) => {
      const merged = mergeAttributes(actionAttributes, extraAttributes);

      if (signals.faro?.api.startUserAction) {
        signals.faro.api.startUserAction(actionName, merged);
        return;
      }

      signals.event(actionName, merged);
    },
    [actionAttributes, actionName, signals]
  );

  const wrap = useCallback(
    <Event,>(
      handler?: ((event: Event) => void) | undefined,
      options?: { track?: 'before' | 'after' | 'never' | undefined }
    ) => {
      return (event: Event) => {
        const trackTiming = options?.track ?? 'before';

        if (trackTiming === 'before') {
          track();
        }

        handler?.(event);

        if (trackTiming === 'after') {
          track();
        }
      };
    },
    [track]
  );

  return {
    actionName,
    attributes: actionAttributes,
    dataAttributes: {
      'data-faro-user-action-name': actionName,
    },
    track,
    wrap,
  };
}

/**
 * Imperative helper for adapter glue that already has a Faro instance.
 */
export function trackFaroUserAction(
  faro: { api: { startUserAction?: (name: string, attributes?: FaroSignalAttributes) => void } },
  actionName: string,
  attributes?: FaroSignalAttributes
): void {
  faro.api.startUserAction?.(actionName, attributes);
}

/**
 * Declaratively attaches a Faro user action to a single child element.
 *
 * This works best with DOM-like components that forward the selected event prop.
 * For shared design-system components, prefer `withFaroUserAction`.
 */
export function FaroUserAction({
  actionName,
  actionProp,
  attributes,
  children,
  eventProp = 'onClick',
  faroActionName,
  faroContext,
  name,
  setDataAttribute = true,
  track = 'before',
}: FaroUserActionProps): ReactElement {
  const child = Children.only(children);
  const action = useFaroUserAction({
    attributes,
    faroActionName: faroActionName ?? actionName,
    faroContext,
    name,
  });

  if (!isValidElement<Record<string, unknown>>(child)) {
    return child;
  }

  const handlerProp = actionProp ?? eventProp;
  const nextProps = createUserActionProps({
    action,
    handler: child.props[handlerProp],
    handlerProp,
    setDataAttribute,
    track,
  });

  return cloneElement(child, nextProps);
}

/**
 * Wraps a component with Faro user-action tracking.
 *
 * Instrument shared UI once, then let product code override `faroActionName`
 * and `faroContext` where needed.
 */
export function withFaroUserAction<Props extends Record<string, unknown>>(
  Component: ComponentType<Props>,
  defaultActionName: string,
  options: WithFaroUserActionOptions<Props> = {}
): WithFaroUserActionComponent<Props> {
  function FaroUserActionComponent(props: Props & FaroUserActionInjectedProps): ReactElement {
    const actionName = resolveUserActionName(props, defaultActionName, options);
    const actionAttributes = mergeAttributes(
      options.attributes,
      options.getAttributes?.(props),
      props.faroContext
    );
    const action = useFaroUserAction({
      attributes: actionAttributes,
      name: actionName,
    });
    const eventProp = options.actionProp ?? options.eventProp ?? 'onClick';
    const nextProps = {
      ...props,
      ...createUserActionProps({
        action,
        handler: props[eventProp],
        handlerProp: eventProp,
        setDataAttribute: options.setDataAttribute ?? true,
        track: options.track ?? 'before',
      }),
    };

    delete nextProps.faroActionName;
    delete nextProps.faroContext;

    return <Component {...(nextProps as Props)} />;
  }

  FaroUserActionComponent.displayName = `withFaroUserAction(${
    Component.displayName ?? Component.name ?? 'Component'
  })`;

  return FaroUserActionComponent;
}

/**
 * Prefixes a local action name with a screen name unless it is already scoped.
 */
export function createFaroActionName(screenName: string, actionName: string): string {
  if (actionName === screenName || actionName.startsWith(`${screenName}.`)) {
    return actionName;
  }

  return `${screenName}.${actionName}`;
}

function createUserActionProps({
  action,
  handler,
  handlerProp,
  setDataAttribute,
  track,
}: {
  action: FaroUserActionHandle;
  handler: unknown;
  handlerProp: string;
  setDataAttribute: boolean;
  track: 'before' | 'after' | 'never';
}): Record<string, unknown> {
  // The explicit handler call carries context. The data attribute keeps the DOM
  // compatible with Faro Web's built-in user-action instrumentation.
  return {
    ...(setDataAttribute ? action.dataAttributes : undefined),
    [handlerProp]: action.wrap(readEventHandler(handler), { track }),
  };
}

function readEventHandler(handler: unknown): ((event: unknown) => void) | undefined {
  return typeof handler === 'function' ? (handler as (event: unknown) => void) : undefined;
}

function resolveUserActionName<Props extends Record<string, unknown>>(
  props: Props & FaroUserActionInjectedProps,
  defaultActionName: string,
  options: WithFaroUserActionOptions<Props>
): string {
  return props.faroActionName ?? options.getActionName?.(props) ?? defaultActionName;
}
