# Swish Callback Service

A minimal Meteor application dedicated to receiving Swish payment callbacks for Uppsala MakerSpace. This service handles payment callbacks separately from the main member app, providing isolated payment processing for stability and simplified deployment.

## Quick Start

```bash
# Copy settings and configure
cp settings_example.json settings.json

# Install dependencies
npm install

# Start development server (port 3003)
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run development server on port 3003 |
| `npm test` | Run test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Build for production deployment |

## Directory Structure

```
swish/
├── server/
│   ├── main.js              # Application entry point
│   └── api/
│       └── callback.js      # Swish callback handler
├── imports/
│   └── common -> ../../common   # Shared collections (symlink)
├── tests/
│   ├── main.js              # Test entry point
│   ├── test-helpers.js      # Shared test utilities
│   └── *.test.js            # Test suites by category
├── settings_example.json    # Configuration template
└── MEMBERSHIP_RULES.md      # Business rules documentation
```

## Configuration

### settings.json

```json
{
  "swish": {
    "expectedCallbackIdentifier": "optional-swish-identifier"
  }
}
```

- `expectedCallbackIdentifier`: Optional Swish callback identifier for validation. If set, callbacks without matching `callbackIdentifier` will be rejected with 403.

## API Endpoint

### POST /swish/callback

Receives Swish payment status callbacks.

**Request body** (from Swish):
```json
{
  "id": "0902D12C7FAE43D3AAAC49622AA79FEF",
  "status": "PAID",
  "amount": 100.00,
  "payerAlias": "46712347689",
  "datePaid": "2022-04-13T09:05:36.717Z"
}
```

**Status values**: `PAID`, `ERROR`, `CANCELLED`, `DECLINED`

**Response codes**:
| Code | Description |
|------|-------------|
| 200 | Callback processed (always returned for valid callbacks to prevent retries) |
| 400 | Invalid JSON body |
| 403 | Invalid callbackIdentifier |
| 405 | Method not allowed (only POST accepted) |
| 500 | Internal server error |

## Test Suite

The service has comprehensive test coverage organized into 11 categories with 53 tests.

| Category | Tests | Description |
|----------|-------|-------------|
| VAL | 2 | Request validation (method, JSON format) |
| NIP | 4 | No initiated payment (orphan callbacks) |
| INIT | 5 | Initiated payment matching and status updates |
| IDEM | 2 | Idempotency (duplicate callback handling) |
| TYPE | 8 | Membership type creation (all 7 payment types + unknown) |
| RENEW | 6 | Renewal timing (grace periods, early/late renewal) |
| QLAB | 5 | Quarterly lab scenarios (Q1-Q4 from rules) |
| SWITCH | 3 | Membership switching (upgrade/downgrade) |
| FAMILY | 4 | Family membership switching (timing restrictions) |
| ERROR | 3 | Business rule error cases |
| DENORM | 9 | Member denormalized field updates |

Run tests:
```bash
npm test
```

## Architecture

This app shares the MongoDB database and common code with the admin and member apps:

- `imports/common/` symlinks to `../../common/` for shared collections and models
- Uses the same `initiatedPayments` collection to match callbacks with payment requests
- Creates `Payment` and `Membership` records in the shared database
- Updates denormalized fields on `Member` records

## Business Logic

See [MEMBERSHIP_RULES.md](./MEMBERSHIP_RULES.md) for detailed documentation of:
- Payment type definitions
- Grace period rules
- Renewal timing (early vs late)
- Quarterly lab scenarios (Q1-Q4)
- Switching scenarios (S1-S4)
- Error cases requiring manual intervention

## Edge Cases

### Missing Initiated Payment
If a callback arrives for an unknown `swishID`:
- Creates an orphan Payment record with `swishID` field for manual matching
- Logs warning for admin review
- Returns 200 to prevent Swish retries

### Unknown Payment Type
If `paymentType` from the initiated payment is not recognized:
- Creates Payment record linked to member
- Does NOT create Membership (requires manual admin handling)
- Logs warning and returns 200

### Business Rule Violations
Some payments violate business rules (e.g., quarterly without base membership):
- Creates Payment record (for audit trail)
- Does NOT create Membership
- Sets `paymentError` field on member with error code
- See MEMBERSHIP_RULES.md for error codes and resolution steps
