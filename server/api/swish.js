import { WebApp } from "meteor/webapp";
import bodyParser from "body-parser";
import { initiatedPayments } from "/collections/initiatedPayments";
import { Payments } from "/collections/payments";

WebApp.handlers.use(bodyParser.json());
WebApp.handlers.use("/swish/callback", (req, res, next) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Only POST is supported!");
    return;
  }
  const obj = req.body;
  if (obj && typeof obj === "object") {
    res.writeHead(200);
    if (obj.status === "PAID") {
      initiatedPayments
        .findOneAsync({ swishID: obj.id })
        .then(async (initiated) => {
          if (!initiated) {
            res.writeHead(404);
            res.end("Payment not found!");
            return;
          }
          res.end("Success!");
          console.log("Payment received");
          initiatedPayments.updateAsync(
            { swishID: obj.id },
            { $set: { status: "PAID", createdAt: obj.datePaid } }
          );
        })
        .catch((err) => {
          console.error(err);
          res.writeHead(500);
          res.end("Internal Server Error");
        });
    } else {
      res.end("Failure!");
    }
  } else {
    res.writeHead(400);
    res.end();
  }
});

/*
// Exmples belof from: https://developer.swish.nu/documentation/guides/create-a-payment-request#if-the-payment-is-successful

// Example of a successful response
{
    "id": "0902D12C7FAE43D3AAAC49622AA79FEF",
    "payeePaymentReference": "0123456789",
    "paymentReference": "652ED6A2BCDE4BA8AD11D7334E9567B7",
    "callbackUrl": "https://example.com/api/swishcb/paymentrequests",
    "payerAlias": "46712347689",
    "payeeAlias": "1234679304",
    "amount": 100.00,
    "currency": "SEK",
    "message": "payment test",
    "status": "PAID",
    "dateCreated": "2022-04-13T09:05:32.717Z",
    "datePaid": "2022-04-13T09:05:36.717Z",
    "errorCode": null,
    "errorMessage": null
}

// status can be: PAID, ERROR, CANCELLED or DECLINED

// Other important information:
A payment request has to be accepted or declined by the consumer within three (3) minutes for e-commerce
and three (3) minutes for m-commerce. When the time has elapsed an ERROR status is returned to the Callback URL.
This timeout is initiated from Swish App, if that is not triggered there is another timeout in backend.
The backend timeout will send ERROR status to the Callback URL after five (5) minutes for e-commerce and
five and a half (5,5) minutes for m-commerce.
If the consumer accepts the payment request a status is returned to the Callback URL within 12 seconds.

 */
