import type { ComponentType, ReactElement, ReactNode } from 'react';

export type FaroSignalAttributeValue = string;
export type FaroSignalAttributes = Record<string, FaroSignalAttributeValue>;
export type FaroSignalOptions = Record<string, unknown>;

export interface FaroSignalsApi {
  pushEvent: (
    name: string,
    attributes?: FaroSignalAttributes,
    domain?: string,
    options?: FaroSignalOptions
  ) => void;
  pushLog: (args: unknown[], options?: FaroSignalOptions) => void;
  pushError: (error: Error, options?: FaroSignalOptions) => void;
  pushMeasurement: (
    payload: { type: string; values: Record<string, number> },
    options?: FaroSignalOptions
  ) => void;
  startUserAction?: (name: string, attributes?: FaroSignalAttributes) => void;
}

export interface FaroSignalsInstance {
  api: FaroSignalsApi;
}

export interface FaroSignalsContextValue {
  attributes: FaroSignalAttributes;
  domain?: string | undefined;
  faro?: FaroSignalsInstance | undefined;
  now: () => number;
}

export interface FaroSignalsProviderProps {
  attributes?: FaroSignalAttributes | undefined;
  children: ReactNode;
  domain?: string | undefined;
  faro?: FaroSignalsInstance | undefined;
  now?: (() => number) | undefined;
}

export interface FaroSignalParamsProps {
  children: ReactNode;
  domain?: string | undefined;
  value: FaroSignalAttributes;
}

export interface FaroParamsProps extends FaroSignalParamsProps {}

export interface FaroScreenProps {
  attributes?: FaroSignalAttributes | undefined;
  children: ReactNode;
  domain?: string | undefined;
  name: string;
  routeTemplate?: string | undefined;
  title?: string | undefined;
  trackView?: boolean | undefined;
}

export interface FaroUserActionOptions {
  actionProp?: string | undefined;
  attributes?: FaroSignalAttributes | undefined;
  eventProp?: string | undefined;
  setDataAttribute?: boolean | undefined;
  track?: 'before' | 'after' | 'never' | undefined;
}

export interface FaroUserActionProps extends FaroUserActionOptions {
  actionName?: string | undefined;
  children: ReactElement<Record<string, unknown>>;
  faroActionName?: string | undefined;
  faroContext?: FaroSignalAttributes | undefined;
  name?: string | undefined;
}

export interface UseFaroUserActionOptions {
  attributes?: FaroSignalAttributes | undefined;
  faroActionName?: string | undefined;
  faroContext?: FaroSignalAttributes | undefined;
  name?: string | undefined;
}

export interface FaroUserActionHandle {
  actionName: string;
  attributes: FaroSignalAttributes;
  dataAttributes: Record<'data-faro-user-action-name', string>;
  track: (attributes?: FaroSignalAttributes) => void;
  wrap: <Event>(
    handler?: ((event: Event) => void) | undefined,
    options?: { track?: 'before' | 'after' | 'never' | undefined }
  ) => (event: Event) => void;
}

export type FaroUserActionInjectedProps = {
  faroActionName?: string | undefined;
  faroContext?: FaroSignalAttributes | undefined;
};

export type WithFaroUserActionOptions<Props> = FaroUserActionOptions & {
  getActionName?: ((props: Props & FaroUserActionInjectedProps) => string | undefined) | undefined;
  getAttributes?:
    | ((props: Props & FaroUserActionInjectedProps) => FaroSignalAttributes | undefined)
    | undefined;
};

export type WithFaroUserActionComponent<Props> = ComponentType<Props & FaroUserActionInjectedProps>;

export interface FaroSignalBaseProps {
  attributes?: FaroSignalAttributes | undefined;
  domain?: string | undefined;
  name: string;
  options?: FaroSignalOptions | undefined;
  when?: boolean | undefined;
}

export interface FaroViewSignalProps extends FaroSignalBaseProps {}
export interface FaroEventSignalProps extends FaroSignalBaseProps {}

export interface FaroMeasurementSignalProps extends FaroSignalBaseProps {
  type?: string | undefined;
  unit?: string | undefined;
  value: number;
}

export type FaroErrorSignalMode = 'error' | 'log' | 'both' | 'auto';

export interface FaroErrorSignalProps extends FaroSignalBaseProps {
  error?: unknown | undefined;
  mode?: FaroErrorSignalMode | undefined;
}

export interface FaroClickSignalProps {
  attributes?: FaroSignalAttributes | undefined;
  children: React.ReactElement<Record<string, unknown>>;
  domain?: string | undefined;
  name: string;
  options?: FaroSignalOptions | undefined;
}
