# ZesDel API — Express + TypeScript + MongoDB

Production-ready REST API for the ZesDel grocery delivery app.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20+ | Non-blocking I/O, great for high-concurrency |
| Language | TypeScript 5 | Type safety, better DX, refactoring confidence |
| Framework | Express 4 | Lightweight, battle-tested, flexible |
| Database | MongoDB + Mongoose | Flexible schema, document model fits grocery data |
| Auth | JWT (Access + Refresh) | Stateless, multi-device, short-lived access tokens |
| Validation | express-validator | Declarative, composable rules |
| Security | helmet, mongoSanitize, rate-limit | NoSQL injection prevention, header hardening |
| Logging | Winston + DailyRotateFile | Structured logs, auto-rotation |

---

## Project Structure

```
src/
├── server.ts              # Entry point — connects DB and starts HTTP server
├── app.ts                 # Express app setup — middleware, routes, error handlers
├── config/
│   └── db.ts              # MongoDB connection with retry logic + pooling
├── models/
│   ├── User.ts            # Users — phone-based auth, bcrypt, refresh token array
│   ├── Category.ts        # Product categories with sort order
│   ├── Product.ts         # Products — full-text search indexes, virtuals
│   ├── Address.ts         # Delivery addresses — GeoJSON 2dsphere index
│   ├── Order.ts           # Orders — status history, price snapshots
│   └── Coupon.ts          # Coupons — flat/percent, usage limits, per-user caps
├── services/
│   ├── token.service.ts   # JWT generation + verification
│   ├── otp.service.ts     # OTP generation, hashing, SMS stub
│   └── order.service.ts   # Complex order placement logic (validation, coupon, fee)
├── controllers/
│   ├── auth.controller.ts
│   ├── product.controller.ts
│   ├── address.controller.ts
│   ├── order.controller.ts
│   └── coupon.controller.ts
├── routes/
│   ├── index.ts           # Barrel — mounts all routers at /api/v1
│   ├── auth.routes.ts
│   ├── product.routes.ts
│   ├── category.routes.ts
│   ├── address.routes.ts
│   ├── order.routes.ts
│   ├── coupon.routes.ts
│   └── admin.routes.ts
├── middleware/
│   ├── auth.ts            # protect (JWT verify) + requireRole
│   ├── errorHandler.ts    # Global error handler + AppError class
│   └── validate.ts        # express-validator result checker
├── validators/
│   ├── auth.validator.ts
│   └── order.validator.ts
├── utils/
│   ├── logger.ts          # Winston logger
│   ├── apiResponse.ts     # Standardised sendSuccess / sendError
│   ├── asyncHandler.ts    # Eliminates try/catch in controllers
│   └── seed.ts            # DB seeder — categories, products, coupons, admin
└── types/
    └── express.d.ts       # Extends Request with req.user
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3. Seed the database
```bash
npm run seed
# Seeds: 6 categories, 15 products, 4 coupons, 1 admin user
# Admin: phone=9999999999, password=123456
```

### 4. Start development server
```bash
npm run dev
# Hot reload via ts-node-dev
# Server: http://localhost:5000
# Health: http://localhost:5000/health
```

### 5. Build for production
```bash
npm run build
npm start
```

---

## API Reference

All routes prefixed with `/api/v1`. Responses follow a consistent shape:
```json
{ "success": true, "message": "...", "data": {...}, "meta": {...} }
```

### Auth  `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Register with name, phone, password |
| POST | `/login` | — | Login → access + refresh tokens |
| POST | `/refresh` | — | Rotate tokens using refresh token |
| POST | `/logout` | ✅ | Revoke refresh token |
| POST | `/forgot-password/send-otp` | — | Send OTP to phone |
| POST | `/forgot-password/verify-otp` | — | Verify OTP → get reset token |
| POST | `/forgot-password/reset` | — | Reset password using reset token |
| GET | `/me` | ✅ | Get current user profile |
| PATCH | `/me` | ✅ | Update name / email |

### Products  `/api/v1/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List & search products (filterable, paginated) |
| GET | `/featured` | — | Products with badges |
| GET | `/:id` | — | Single product detail |
| POST | `/` | 🔒 Admin | Create product |
| PATCH | `/:id` | 🔒 Admin | Update product |
| DELETE | `/:id` | 🔒 Admin | Delete product |

**Filter params** for `GET /products`:
- `search` — full-text search
- `category` — category slug (veg, fruit, dairy, bakery, snacks, care)
- `minPrice`, `maxPrice` — price range
- `minRating` — minimum rating (0–5)
- `onSale` — `true` for discounted items
- `inStock` — `true` for available items
- `sort` — `relevance` | `priceAsc` | `priceDesc` | `rating` | `discount`
- `page`, `limit` — pagination

### Categories  `/api/v1/categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List all active categories with item counts |

### Addresses  `/api/v1/addresses`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | List user's addresses |
| POST | `/` | ✅ | Add address (supports lat/lng for map) |
| PATCH | `/:id` | ✅ | Edit address |
| DELETE | `/:id` | ✅ | Delete address |
| PATCH | `/:id/set-default` | ✅ | Set as default |

### Orders  `/api/v1/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Place order (validates stock, applies coupon, snapshots price) |
| GET | `/` | ✅ | List user's orders (filterable by status) |
| GET | `/:id` | ✅ | Order details with status history |
| POST | `/:id/cancel` | ✅ | Cancel order (placed/confirmed only) |

**Place order body:**
```json
{
  "items": [{ "productId": "...", "quantity": 2 }],
  "addressId": "...",
  "couponCode": "FRESH20",
  "paymentMethod": "upi"
}
```

### Coupons  `/api/v1/coupons`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List active coupons |
| POST | `/validate` | ✅ | Validate coupon + compute discount |
| POST | `/` | 🔒 Admin | Create coupon |
| PATCH | `/:id` | 🔒 Admin | Update coupon |
| DELETE | `/:id` | 🔒 Admin | Delete coupon |

### Admin  `/api/v1/admin`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/orders` | 🔒 Admin | All orders (filterable by status) |
| PATCH | `/orders/:id/status` | 🔒 Admin | Update order status with validation |

---

## Security Architecture

- **Access tokens**: short-lived (15min), sent in `Authorization: Bearer` header
- **Refresh tokens**: long-lived (7d), stored hashed in DB array (multi-device)
- **Refresh token rotation**: old token invalidated on each refresh
- **Password hashing**: bcrypt with salt rounds = 12
- **OTP hashing**: bcrypt (never stored in plain text)
- **Rate limiting**: 100 req/15min global, 20 req/15min on auth routes
- **Input sanitisation**: mongoSanitize strips `$` and `.` from inputs
- **NoSQL injection**: prevented via express-mongo-sanitize
- **Response transform**: passwordHash, refreshTokens, otpHash never returned in API responses

---

## MongoDB Index Strategy

| Collection | Indexes |
|---|---|
| users | `phone` (unique), `phone + isActive` |
| products | `category`, `categorySlug + isAvailable + price`, `name + subtitle + tags` (text), `isAvailable + rating` |
| orders | `user + createdAt`, `user + status`, `status + createdAt` |
| addresses | `user + isDefault`, `location` (2dsphere) |
| coupons | `code + isActive` |

---

## Scalability Notes

- **Connection pooling**: `maxPoolSize: 10` in Mongoose (increase for higher load)
- **Pagination**: all list endpoints support `page` + `limit` (capped at 50)
- **Lean queries**: Add `.lean()` to read-only queries for 30-40% speed boost when needed
- **Projection**: Only fetch needed fields; sensitive fields are `select: false`
- **Status history**: Array within order document (no extra collection round-trips)
- **Price snapshots**: Order items store price at purchase time (audit trail)
- **Geospatial**: Address has 2dsphere index ready for future delivery zone queries

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Min 32 chars, high entropy |
| `JWT_REFRESH_SECRET` | ✅ | Different from JWT_SECRET |
| `JWT_EXPIRES_IN` | — | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | — | Default `7d` |
| `PORT` | — | Default `5000` |
| `NODE_ENV` | — | `development` / `production` |
| `OTP_EXPIRY_MINUTES` | — | Default `10` |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins |
| `RATE_LIMIT_MAX` | — | Default `100` |
