# Testing Payment App with Swish Test Infrastructure

## 1. Running the Automated Tests

The payment service has 55 tests that simulate Swish callbacks without needing the real Swish infrastructure:

```bash
cd payment
npm test              # Run once
npm run test:watch    # Watch mode
```

These tests mock Swish callbacks by posting directly to `/swish/callback`.

---

## 2. End-to-End Testing with Swish Sandbox

To test with the actual Swish test environment, you need both apps running:

**Terminal 1 - Payment callback service:**
```bash
cd payment
npm run dev    # Runs on port 3003
```

**Terminal 2 - Member app (initiates payments):**
```bash
cd app
npm run dev    # Runs on port 3001
```

**Requirements:**
- Swish test certificates in `app/private/` (cert.pem, key.pem, ca.pem)
- `swishCallback` URL in `app/settings.json` pointing to a publicly accessible URL

---

## 3. The Challenge: Callback URL

Swish needs to reach your callback endpoint. Options:

| Method | Setup |
|--------|-------|
| **ngrok** | `ngrok http 3003` → Use the HTTPS URL as `swishCallback` |
| **Cloudflare Tunnel** | `cloudflared tunnel --url http://localhost:3003` |
| **Deploy to server** | Run on a server with public HTTPS |

Example `app/settings.json`:
```json
{
  "swishCallback": "https://your-tunnel-url.ngrok.io/swish/callback"
}
```

---

## 4. Test Flow

1. Log in to the member app (localhost:3001)
2. Initiate a payment (calls `swish.createTestPayment`)
3. The app creates an `initiatedPayment` record and calls Swish API
4. You get a QR code or payment token
5. Use Swish test app/simulator to complete payment
6. Swish sends callback to your tunnel URL → payment service
7. Payment service creates Payment + Membership records

---

## 5. Swish Test Credentials (already configured)

- **Payee Alias:** `9871065216` (in `app/server/methods/payments.js`)
- **Test Phone Numbers:** From Swish's test aliases file
- **API Endpoint:** `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/`

---

## 6. Manual Callback Testing

You can also manually test callbacks using curl:

```bash
# Simulate a PAID callback
curl -X POST http://localhost:3003/swish/callback \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_INSTRUCTION_ID",
    "status": "PAID",
    "amount": 300,
    "payerAlias": "46701234567",
    "datePaid": "2026-01-26T12:00:00.000Z"
  }'
```

Replace `YOUR_INSTRUCTION_ID` with the `externalId` from an `initiatedPayment` record.

---

## 7. Checking Results

After a callback, verify in MongoDB:

```bash
# Connect to the database
meteor mongo

# Check initiated payment status
db.initiatedPayments.find({externalId: "YOUR_INSTRUCTION_ID"})

# Check payment record was created
db.payments.find().sort({date: -1}).limit(1)

# Check membership was created
db.memberships.find().sort({start: -1}).limit(1)
```
