# Faro React Signals React Web example

This example shows how to use `faro-react-signals` with Grafana Faro in a React Web app.

It includes a local Docker observability stack:

- Grafana on <http://localhost:3000>
- Grafana Alloy Faro receiver on <http://localhost:12347/collect>
- Loki on <http://localhost:3100>
- Tempo on <http://localhost:3200>
- Example app on <http://localhost:5173>

## Run everything with Docker

From this directory:

```sh
docker compose up --build
```

Open the app at <http://localhost:5173>, click through the checkout demo, then open Grafana at <http://localhost:3000>.

Anonymous admin access is enabled for local development. The dashboard is provisioned under `Examples / Faro React Signals Example`.

## Run the app locally against the Docker stack

If you prefer running Vite outside Docker:

```sh
docker compose up alloy grafana loki tempo
pnpm install
pnpm dev
```

The app sends telemetry to `http://localhost:12347/collect` by default. Override it with:

```sh
VITE_FARO_COLLECTOR_URL=http://localhost:12347/collect pnpm dev
```

## What to try

- Click `Card`, then `Submit checkout` to emit a successful user action, custom event, and duration measurement.
- Click `Bank transfer`, then `Submit checkout` to emit a failed user action, custom error, and duration measurement.
- Inspect Loki logs in Grafana with `{app="faro-react-signals-example"}`.

## Why this setup uses `faro.receiver`

Grafana Alloy's `faro.receiver` is intended for self-hosted Grafana setups. It accepts telemetry from the Faro Web SDK and forwards logs to Loki and traces to an OpenTelemetry consumer such as Tempo.
