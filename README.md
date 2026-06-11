# faro-react-signals

Declarative React helpers for Grafana Faro.

This package does not replace `@grafana/faro-react`. Faro's React package owns router instrumentation, error boundaries, profiling, SSR support, and the Faro runtime. `faro-react-signals` adds a JSX, hook, and design-system adapter layer for app-authored user actions and custom signals.


## Install

```sh
npm install faro-react-signals

pnpm add faro-react-signals

yarn add faro-react-signals
```

## User actions first

```tsx
import { FaroScreen, FaroUserAction } from 'faro-react-signals';

export function CheckoutPage() {
  return (
    <FaroScreen name="checkout" routeTemplate="/checkout" title="Checkout">
      <FaroUserAction name="submit" faroContext={{ paymentMethod: 'card' }}>
        <button type="button" onClick={submitCheckout}>
          Submit
        </button>
      </FaroUserAction>
    </FaroScreen>
  );
}
```

`FaroUserAction` calls Faro Web SDK's `startUserAction` when available and also adds `data-faro-user-action-name` to the wrapped element by default.

## Design-system integration

```tsx
import { withFaroUserAction } from 'faro-react-signals';
import { Button as BaseButton } from './design-system';

export const Button = withFaroUserAction(BaseButton, 'button.clicked', {
  getAttributes: props => ({ variant: props.variant }),
});

<Button faroActionName="checkout.submit" faroContext={{ paymentMethod: 'card' }}>
  Submit
</Button>;
```

This is the recommended path for teams with a design system: instrument the shared component once, then let product code stay focused on UI intent.

| Helper | Faro API |
| --- | --- |
| `FaroViewSignal` | `faro.api.pushEvent` |
| `FaroClickSignal` | `faro.api.pushEvent` |
| `FaroEventSignal` | `faro.api.pushEvent` |
| `FaroErrorSignal` | `faro.api.pushError` or `faro.api.pushLog` |
| `FaroMeasurementSignal` | `faro.api.pushMeasurement` |

## Context attributes

```tsx
import { FaroParams, FaroViewSignal } from 'faro-react-signals';

export function CheckoutPage() {
  return (
    <FaroParams value={{ flow: 'checkout', routeTemplate: '/checkout' }}>
      <FaroViewSignal name="checkout.viewed" />
      <CheckoutForm />
    </FaroParams>
  );
}
```

Child observations merge inherited attributes with local attributes.

## Click observations

```tsx
import { FaroClickSignal } from 'faro-react-signals';

<FaroClickSignal
  name="checkout.submit.clicked"
  attributes={{ paymentMethod: 'card' }}
>
  <button type="button" onClick={submitCheckout}>
    Submit
  </button>
</FaroClickSignal>;
```

`FaroClickSignal` emits the Faro event before delegating to the child `onClick` handler. It does not instrument unwrapped clicks.

## Conditional observations

```tsx
import { FaroErrorSignal, FaroEventSignal, FaroMeasurementSignal } from 'faro-react-signals';

<FaroEventSignal
  name="checkout.discount.applied"
  attributes={{ source: 'promo_code' }}
  when={discountApplied}
/>;

<FaroErrorSignal
  name="checkout.submit.failed"
  error={error}
  attributes={{ failureKind: 'payment_declined' }}
  when={status === 'failed'}
/>;

<FaroMeasurementSignal
  name="checkout.client_validation.duration"
  value={120}
  unit="ms"
  attributes={{ step: 'payment' }}
/>;
```

`FaroErrorSignal` defaults to `pushError` for real `Error` objects and `pushLog` for non-`Error` values.

## Manual user-action wiring

```tsx
import { useFaroUserAction } from 'faro-react-signals';

function SubmitButton() {
  const submit = useFaroUserAction({
    name: 'checkout.submit',
    faroContext: { paymentMethod: 'card' },
  });

  return (
    <button type="button" {...submit.dataAttributes} onClick={submit.wrap(submitCheckout)}>
      Submit
    </button>
  );
}
```

Use `useFaroUserAction` when a component cannot be safely wrapped with `FaroUserAction` or `withFaroUserAction`.

## Testing with a mocked Faro API

```tsx
import { FaroSignalsProvider, FaroViewSignal } from 'faro-react-signals';

const faro = {
  api: {
    pushEvent: vi.fn(),
    pushLog: vi.fn(),
    pushError: vi.fn(),
    pushMeasurement: vi.fn(),
  },
};

render(
  <FaroSignalsProvider faro={faro}>
    <FaroViewSignal name="checkout.viewed" />
  </FaroSignalsProvider>
);
```

Use `FaroSignalsProvider` to inject a test double or isolated Faro instance.
