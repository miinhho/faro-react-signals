import { FaroSignalsProvider } from 'faro-react-signals';
import { faro } from './faro';
import { CheckoutExample } from './features/checkout/CheckoutExample';

export function App() {
  return (
    <FaroSignalsProvider faro={faro}>
      <CheckoutExample />
    </FaroSignalsProvider>
  );
}
