import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  FaroClickSignal,
  FaroErrorSignal,
  FaroEventSignal,
  FaroMeasurementSignal,
  FaroScreen,
  FaroSignalParams,
  type FaroSignalsInstance,
  FaroSignalsProvider,
  FaroUserAction,
  FaroViewSignal,
  withFaroUserAction,
} from '../src';

function createFaro(): FaroSignalsInstance {
  return {
    api: {
      pushEvent: vi.fn(),
      pushLog: vi.fn(),
      pushError: vi.fn(),
      pushMeasurement: vi.fn(),
      startUserAction: vi.fn(),
    },
  };
}

describe('faro-react-signals', () => {
  it('emits view and event signals with inherited attributes', () => {
    const faro = createFaro();

    render(
      <FaroSignalsProvider faro={faro} domain="product">
        <FaroSignalParams value={{ flow: 'checkout' }}>
          <FaroViewSignal name="checkout.viewed" attributes={{ step: 'cart' }} />
          <FaroEventSignal name="checkout.discount.applied" attributes={{ source: 'promo' }} />
        </FaroSignalParams>
      </FaroSignalsProvider>
    );

    expect(faro.api.pushEvent).toHaveBeenNthCalledWith(
      1,
      'checkout.viewed',
      { flow: 'checkout', step: 'cart' },
      'product',
      undefined
    );
    expect(faro.api.pushEvent).toHaveBeenNthCalledWith(
      2,
      'checkout.discount.applied',
      { flow: 'checkout', source: 'promo' },
      'product',
      undefined
    );
  });

  it('emits click signals before the child click handler', () => {
    const faro = createFaro();
    const order: string[] = [];

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroClickSignal name="checkout.submit.clicked">
          <button type="button" onClick={() => order.push('handler')}>
            Submit
          </button>
        </FaroClickSignal>
      </FaroSignalsProvider>
    );

    vi.mocked(faro.api.pushEvent).mockImplementation(() => order.push('signal'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(order).toEqual(['signal', 'handler']);
  });

  it('routes Error objects to pushError and non-Error values to pushLog by default', () => {
    const faro = createFaro();
    const error = new Error('payment declined');

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroErrorSignal name="checkout.submit.failed" error={error} />
        <FaroErrorSignal name="checkout.submit.invalid" error="invalid payment data" />
      </FaroSignalsProvider>
    );

    expect(faro.api.pushError).toHaveBeenCalledWith(error, {
      context: { faroSignalName: 'checkout.submit.failed' },
    });
    expect(faro.api.pushLog).toHaveBeenCalledWith(
      ['checkout.submit.invalid', 'invalid payment data'],
      { context: { faroSignalName: 'checkout.submit.invalid' } }
    );
  });

  it('emits measurements with unit context', () => {
    const faro = createFaro();

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroMeasurementSignal
          name="checkout.client_validation.duration"
          value={120}
          unit="ms"
          attributes={{ step: 'payment' }}
        />
      </FaroSignalsProvider>
    );

    expect(faro.api.pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'faro.react.signal',
        values: { 'checkout.client_validation.duration': 120 },
      },
      { context: { step: 'payment', unit: 'ms' } }
    );
  });

  it('tracks declarative Faro user actions with inherited screen context', () => {
    const faro = createFaro();

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroScreen name="checkout" routeTemplate="/checkout" title="Checkout">
          <FaroUserAction name="submit" faroContext={{ paymentMethod: 'card' }}>
            <button type="button">Submit</button>
          </FaroUserAction>
        </FaroScreen>
      </FaroSignalsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(faro.api.pushEvent).toHaveBeenCalledWith(
      'checkout.viewed',
      {
        routeTemplate: '/checkout',
        screenName: 'checkout',
        screenTitle: 'Checkout',
      },
      undefined,
      undefined
    );
    expect(faro.api.startUserAction).toHaveBeenCalledWith('submit', {
      paymentMethod: 'card',
      routeTemplate: '/checkout',
      screenName: 'checkout',
      screenTitle: 'Checkout',
    });
    expect(
      screen.getByRole('button', { name: 'Submit' }).getAttribute('data-faro-user-action-name')
    ).toBe('submit');
  });

  it('wraps design-system components with withFaroUserAction', () => {
    const faro = createFaro();
    const onClick = vi.fn();
    type ButtonProps = { children: ReactNode; onClick?: () => void } & Record<string, unknown>;
    function Button(props: ButtonProps) {
      return <button type="button" {...props} />;
    }
    const TrackedButton = withFaroUserAction(Button, 'checkout.submit', {
      getAttributes: () => ({ component: 'button' }),
    });

    render(
      <FaroSignalsProvider faro={faro}>
        <TrackedButton faroContext={{ variant: 'primary' }} onClick={onClick}>
          Submit
        </TrackedButton>
      </FaroSignalsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(faro.api.startUserAction).toHaveBeenCalledWith('checkout.submit', {
      component: 'button',
      variant: 'primary',
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('falls back to pushEvent when Faro startUserAction is not available', () => {
    const faro = createFaro();
    delete faro.api.startUserAction;

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroSignalParams value={{ screenName: 'search' }}>
          <FaroUserAction name="search.submit">
            <button type="button">Search</button>
          </FaroUserAction>
        </FaroSignalParams>
      </FaroSignalsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(faro.api.pushEvent).toHaveBeenCalledWith(
      'search.submit',
      { screenName: 'search' },
      undefined,
      undefined
    );
  });

  it('supports design-system components that use non-click event props', () => {
    const faro = createFaro();
    const onSelect = vi.fn();

    type CommandItemProps = {
      children: ReactNode;
      onSelect?: () => void;
    } & Record<string, unknown>;
    function CommandItem({ children, onSelect: handleSelect, ...props }: CommandItemProps) {
      return (
        <button type="button" onClick={handleSelect} {...props}>
          {children}
        </button>
      );
    }

    const TrackedCommandItem = withFaroUserAction(CommandItem, 'command.default', {
      eventProp: 'onSelect',
    });

    render(
      <FaroSignalsProvider faro={faro}>
        <TrackedCommandItem
          faroActionName="command.pick"
          faroContext={{ source: 'palette' }}
          onSelect={onSelect}
        >
          Pick
        </TrackedCommandItem>
      </FaroSignalsProvider>
    );

    const item = screen.getByRole('button', { name: 'Pick' });
    fireEvent.click(item);

    expect(faro.api.startUserAction).toHaveBeenCalledWith('command.pick', {
      source: 'palette',
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(item.getAttribute('faroactionname')).toBeNull();
    expect(item.getAttribute('farocontext')).toBeNull();
  });

  it('can track after the original handler when requested', () => {
    const faro = createFaro();
    const order: string[] = [];
    // biome-ignore lint/style/noNonNullAssertion: For mock implementation of faro api
    vi.mocked(faro.api.startUserAction!).mockImplementation(() => order.push('track'));

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroUserAction name="save" track="after">
          <button type="button" onClick={() => order.push('handler')}>
            Save
          </button>
        </FaroUserAction>
      </FaroSignalsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(order).toEqual(['handler', 'track']);
  });

  it('can opt out of writing Faro data attributes while still tracking', () => {
    const faro = createFaro();

    render(
      <FaroSignalsProvider faro={faro}>
        <FaroUserAction name="download" setDataAttribute={false}>
          <button type="button">Download</button>
        </FaroUserAction>
      </FaroSignalsProvider>
    );

    const button = screen.getByRole('button', { name: 'Download' });
    fireEvent.click(button);

    expect(button.getAttribute('data-faro-user-action-name')).toBeNull();
    expect(faro.api.startUserAction).toHaveBeenCalledWith('download', {});
  });
});
