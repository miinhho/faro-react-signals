import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

const faroCollectorUrl =
  import.meta.env.VITE_FARO_COLLECTOR_URL ?? 'http://localhost:12347/collect';

export const faro = initializeFaro({
  url: faroCollectorUrl,
  app: {
    name: 'faro-react-signals-example',
    version: '0.1.0',
    environment: 'local',
  },
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: true,
    }),
  ],
});
