import {
  FaroErrorSignal,
  FaroEventSignal,
  FaroMeasurementSignal,
  FaroScreen,
  FaroUserAction,
} from 'faro-react-signals';
import { useState } from 'react';

import { Button } from '../../components/Button';

const checkoutScreenAttributes = {
  flow: 'purchase',
  surface: 'example-app',
};

type PaymentMethod = 'card' | 'bank';
type CheckoutStatus = 'idle' | 'validating' | 'success' | 'failed';

export function CheckoutExample() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | undefined>();

  function validateCheckout() {
    const started = performance.now();
    setStatus('validating');
    setError(undefined);

    setTimeout(() => {
      const nextDuration = Math.round(performance.now() - started);
      setDuration(nextDuration);

      if (paymentMethod === 'bank') {
        setStatus('failed');
        setError(new Error('Bank transfer is disabled in the demo checkout.'));
        return;
      }

      setStatus('success');
    }, 350);
  }

  return (
    <FaroScreen
      name="checkout"
      routeTemplate="/examples/checkout"
      title="Checkout observability demo"
      attributes={checkoutScreenAttributes}
    >
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">faro-react-signals</p>
          <h1>Declarative user-action observability for React Web</h1>
          <p className="lede">
            This example sends Faro user actions, custom events, errors, and measurements to a local
            Grafana stack through Grafana Alloy.
          </p>
        </section>

        <section className="panel">
          <fieldset className="fieldGroup">
            <legend>Payment method</legend>
            <FaroUserAction
              name="checkout.payment_method.card"
              faroContext={{ paymentMethod: 'card' }}
            >
              <button
                className={paymentMethod === 'card' ? 'choice selected' : 'choice'}
                onClick={() => setPaymentMethod('card')}
                type="button"
              >
                Card
              </button>
            </FaroUserAction>

            <FaroUserAction
              name="checkout.payment_method.bank"
              faroContext={{ paymentMethod: 'bank' }}
            >
              <button
                className={paymentMethod === 'bank' ? 'choice selected' : 'choice'}
                onClick={() => setPaymentMethod('bank')}
                type="button"
              >
                Bank transfer
              </button>
            </FaroUserAction>
          </fieldset>

          <Button
            faroActionName="checkout.submit"
            faroContext={{ paymentMethod }}
            onClick={validateCheckout}
            variant="primary"
          >
            Submit checkout
          </Button>

          <FaroEventSignal
            name="checkout.validation.succeeded"
            attributes={{ paymentMethod }}
            when={status === 'success'}
          />
          <FaroErrorSignal
            name="checkout.validation.failed"
            attributes={{ paymentMethod }}
            error={error}
            when={status === 'failed'}
          />
          <FaroMeasurementSignal
            name="checkout.validation.duration"
            attributes={{ paymentMethod, status }}
            unit="ms"
            value={duration}
            when={status === 'success' || status === 'failed'}
          />

          <div className={`status ${status}`}>
            <span>Status</span>
            <strong>{status}</strong>
          </div>

          {error ? <p className="errorText">{error.message}</p> : null}
        </section>
      </main>
    </FaroScreen>
  );
}
