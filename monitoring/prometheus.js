const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const apiErrorsTotal = new client.Counter({
  name: "api_errors_total",
  help: "Total API errors by code and route",
  labelNames: ["method", "route", "status_code", "code"],
  registers: [register],
});

function observeHttpRequest({ method, route, statusCode, durationMs }) {
  const labels = { method, route, status_code: String(statusCode) };
  httpRequestsTotal.inc(labels);
  httpRequestDurationMs.observe(labels, durationMs);
}

function observeApiError({ method, route, statusCode, code }) {
  apiErrorsTotal.inc({
    method,
    route,
    status_code: String(statusCode),
    code,
  });
}

async function getMetrics() {
  return register.metrics();
}

const metricsContentType = register.contentType;

module.exports = {
  observeHttpRequest,
  observeApiError,
  getMetrics,
  metricsContentType,
};
