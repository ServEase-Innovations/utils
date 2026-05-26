# Serveaso Utils API

Node.js (CommonJS) service: **email** routes, **MongoDB/Postgres** utilities, **Auth0/JWT** samples, **Razorpay** order creation, **Firebase Cloud Messaging (push)**, **WebSockets**, and Swagger. Runs **two HTTP servers** in one process (main app + email app) with configurable ports.

## Quick reference

| Server | Default port | Env |
|--------|--------------|-----|
| Main (HTTP + WebSocket) | **3030** | `PORT` |
| Email HTTP app | **4030** | `UTILS_EMAIL_PORT` |
| **Metrics** | `GET /metrics` on **main** port only | Scrape job **`utils-app`** |
| **Logs** | `logs/app.log` | Loki **`{job="utils-app"}`** |

See [`.env.example`](.env.example) for `PORT`, `UTILS_EMAIL_PORT`, `RAZORPAY_*`, **FCM**, and **MongoDB**.

## Install & run

```bash
npm install
npm run dev
```

From the **monorepo root**, install workspaces so `firebase-admin` is available:

```bash
npm install
```

---

## Firebase Cloud Messaging (FCM)

Push notifications are handled by the **utils** service. Mobile apps register FCM device tokens; the backend stores them in **MongoDB** and sends messages via **Firebase Admin SDK**.

### Architecture

```text
┌─────────────────┐     POST /api/push/register      ┌──────────────────┐
│  iOS / Android  │ ───────────────────────────────► │  utils service   │
│  (@react-native-│     (FCM token + user context)   │  (port 3030)     │
│   firebase)     │                                  └────────┬─────────┘
└─────────────────┘                                           │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ MongoDB          │
                                                    │ collection:      │
                                                    │  devicetokens    │
                                                    └────────┬─────────┘
                                                              │
┌─────────────────┐     POST /api/push/send          ┌────────▼─────────┐
│  Admin web UI   │ ───────────────────────────────► │ Firebase Admin   │
│  (ServEase_UI)  │     X-Admin-Push-Secret          │ (FCM HTTP v1)    │
└─────────────────┘                                  └──────────────────┘
```

| Piece | Location |
|-------|----------|
| FCM send + init | [`services/fcm.service.js`](services/fcm.service.js) |
| HTTP routes | [`routes/pushRoutes.js`](routes/pushRoutes.js) → mounted at **`/api/push`** |
| Mongoose model | [`models/DeviceToken.js`](models/DeviceToken.js) |
| Admin auth | [`middleware/adminPushAuth.js`](middleware/adminPushAuth.js) |
| iOS client | [`apps/servease-ios`](../apps/servease-ios) → `src/services/pushNotifications.ts` |
| Admin UI | [`apps/servase-ui`](../apps/servase-ui) → **Admin → Push notifications** |

### 1. Firebase project (Google Cloud)

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project (e.g. `serveaso-android`).
2. Add **iOS** and/or **Android** apps with the correct bundle ID / package name.
3. Download client config:
   - **iOS:** `GoogleService-Info.plist` → add to the Xcode project under `apps/servease-ios/ios/`.
   - **Android:** `google-services.json` → `apps/servease-ios/android/app/`.
4. Enable **Cloud Messaging** for the project.

### 2. Service account (server / FCM send)

The utils service needs a **Firebase service account** JSON to call FCM as an admin.

1. Firebase Console → **Project settings** → **Service accounts** → **Generate new private key**.
2. Save the file locally (never commit it). Gitignored paths the server checks automatically:

   | Path | Notes |
   |------|--------|
   | `services/utils/firebase-service-account.json` | Easiest for local dev |
   | `services/utils/secrets/firebase-service-account.json` | Alternative |
   | Env `GOOGLE_APPLICATION_CREDENTIALS` | Path to the JSON file |
   | Env `FIREBASE_SERVICE_ACCOUNT_PATH` | Path relative to `services/utils` |
   | Env `FIREBASE_SERVICE_ACCOUNT_JSON` | Minified JSON **or** base64-encoded JSON (typical on **Render**) |

On startup, `initFirebaseAdmin()` runs from [`server.js`](server.js). Logs:

- `[fcm] Firebase Admin initialized from …` → push send is enabled.
- `[fcm] Firebase credentials missing` → `/api/push/send` returns **503**.

**Production (Render):** set `FIREBASE_SERVICE_ACCOUNT_JSON` in the utils service environment. Use a single-line minified JSON or base64 string. Do not commit credentials; see `.gitignore` (`firebase-service-account.json`, `firebase-for-render.txt`).

### 3. Environment variables (utils)

Copy [`.env.example`](.env.example) to `.env.development` (local) or `.env` (server).

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGO_URI` | Yes (for push DB) | MongoDB connection for Mongoose / `DeviceToken` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` or file paths above | Yes (to send) | Firebase Admin credentials |
| `ADMIN_PUSH_SECRET` | Yes (admin send) | Shared secret; must match admin UI |

### 4. MongoDB — device token storage

Push registration does **not** use PostgreSQL. Tokens are stored with **Mongoose** in MongoDB.

| Item | Value |
|------|--------|
| Model | `DeviceToken` ([`models/DeviceToken.js`](models/DeviceToken.js)) |
| Collection name | **`devicetokens`** (Mongoose default pluralization) |
| Database | Same MongoDB instance your utils process uses (`MONGO_URI` / deployment config) |

#### `devicetokens` document shape

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | FCM registration token (unique, indexed) |
| `platform` | `ios` \| `android` \| `web` | Device platform |
| `email` | string | User email (lowercase), optional |
| `userId` | string | App user id, optional |
| `role` | string | e.g. `CUSTOMER`, `SERVICE_PROVIDER` |
| `serviceProviderId` | string | Provider id when applicable |
| `customerId` | string | Customer id when applicable |
| `deviceName` | string | e.g. `Apple iPhone 15` |
| `lastSeenAt` | date | Updated on each register |
| `disabled` | boolean | `true` when token is invalid / stale |
| `createdAt` / `updatedAt` | date | Mongoose timestamps |

#### Registration behaviour

- **`POST /api/push/register`** — public; called by mobile after login when FCM permission is granted.
- Tokens must be **≥ 100 characters** (real FCM tokens, not test strings).
- For a given **email + platform**, older tokens are **disabled** when a new token is registered (one active device per email per platform).
- Invalid tokens reported by FCM on send are marked `disabled: true`.

#### Useful MongoDB queries

```javascript
// Active tokens
db.devicetokens.find({ disabled: { $ne: true } }).count()

// By platform
db.devicetokens.find({ platform: "ios", disabled: { $ne: true } })

// By role
db.devicetokens.find({ role: "SERVICE_PROVIDER", disabled: { $ne: true } })
```

### 5. Push API (utils)

Base path: **`/api/push`** (on main port, default `http://localhost:3030`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | None | Register or refresh device token (mobile) |
| `POST` | `/send` | `X-Admin-Push-Secret` | Send notification to an audience |
| `GET` | `/devices` | `X-Admin-Push-Secret` | List registered devices (token preview only) |
| `GET` | `/stats` | `X-Admin-Push-Secret` | Counts + `fcmReady` flag |

#### Register (mobile)

```http
POST /api/push/register
Content-Type: application/json

{
  "token": "<FCM registration token>",
  "platform": "ios",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "customerId": "123",
  "deviceName": "Apple iPhone"
}
```

#### Send (admin)

```http
POST /api/push/send
X-Admin-Push-Secret: <ADMIN_PUSH_SECRET>
Content-Type: application/json

{
  "title": "Serveaso",
  "body": "Your booking was confirmed.",
  "target": "all"
}
```

`target` values: `all`, or filter with `role` / `platform`, or `target: "devices"` + `deviceIds`, or `target: "emails"` + `emails`, or `target: "tokens"` + `tokens`.

For broadcast-style sends, **one push per email** is used (latest `lastSeenAt` device) to avoid duplicate notifications from stale tokens.

### 6. Mobile app (iOS / Android)

Repo: [`apps/servease-ios`](../apps/servease-ios).

1. Install native Firebase config (`GoogleService-Info.plist` / `google-services.json`).
2. Dependencies: `@react-native-firebase/app`, `@react-native-firebase/messaging`; Android also uses `@notifee/react-native` for foreground display.
3. After login, `App.tsx` calls `setupPushNotifications(user)` → requests permission → `getToken()` → **`POST /api/push/register`** to utils (`UTILS_BASE_URL` / env in the app).
4. Token refresh is re-registered automatically.

**Utils base URL** in the app must point at this service (e.g. `http://<LAN-IP>:3030` for device testing, or production utils URL).

### 7. Admin web (send + device list)

Repo: [`apps/servase-ui`](../apps/servase-ui) → sidebar **Push notifications**.

| Variable | Purpose |
|----------|---------|
| `REACT_APP_UTILS_URL` | Utils API base (e.g. `http://localhost:3030`) |
| `REACT_APP_ADMIN_PUSH_SECRET` | Same value as utils `ADMIN_PUSH_SECRET` |

The page calls `/api/push/stats`, `/api/push/devices`, and `/api/push/send` with header **`X-Admin-Push-Secret`**.

### 8. Verify setup

1. Start utils: `npm run dev` in `services/utils` (or monorepo dev script).
2. Check logs for `[fcm] Firebase Admin initialized`.
3. Open admin **Push notifications** — **FCM ready** should be true.
4. Log in on a physical device, accept notification permission, confirm a row appears in `devicetokens` (or admin device list).
5. Send a test push from admin; device should receive it.

**Troubleshooting**

| Symptom | Check |
|---------|--------|
| `fcmReady: false` | Service account env / JSON file path |
| `503` on send | Same as above |
| No devices listed | Mongo connection, app reached `/api/push/register`, token length ≥ 100 |
| iOS no token | Real device, push capability, `GoogleService-Info.plist` |
| Android no notification | POST_NOTIFICATIONS (API 33+), Notifee channel `serveaso_default` |

---

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
