# Serveaso Utils API

Node.js (CommonJS) service: **email** routes, **MongoDB/Postgres** utilities, **Auth0/JWT** samples, **Razorpay** order creation, **WebSockets**, and Swagger. Runs **two HTTP servers** in one process (main app + email app) with configurable ports.

## Quick reference

| Server | Default port | Env |
|--------|--------------|-----|
| Main (HTTP + WebSocket) | **3030** | `PORT` |
| Email HTTP app | **4030** | `UTILS_EMAIL_PORT` |
| **Metrics** | `GET /metrics` on **main** port only | Scrape job **`utils-app`** |
| **Logs** | `logs/app.log` | Loki **`{job="utils-app"}`** |

See `.env.example` for `PORT`, `UTILS_EMAIL_PORT`, and `RAZORPAY_*`.

## Install & run

```bash
npm install
npm run dev
```

## Observability

- **`monitoring/prometheus.js`** + **`monitoring/requestMetrics.js`** — HTTP metrics for **both** Express apps share one registry; **`/metrics`** is only on the **main** server (scraping **3030** includes traffic observed on both apps).
- **`logger.js`** — JSON logs to **`logs/app.log`**.

**Docker stack** (Prometheus **9204**, Grafana **3204**, Loki **3124**):

```bash
npm run monitoring:up
```

1. Start the app (main on **3030** when using monorepo defaults).
2. Grafana: http://localhost:3204 (admin/admin).
3. **Explore → Loki**: `{job="utils-app"}`.

Stop: `npm run monitoring:down`.

## API documentation

Swagger UI is mounted at **`/api-docs`** on the main app (see `docs/swaggerDocs`).

## License

ISC (see `package.json`).
