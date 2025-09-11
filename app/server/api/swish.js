import { WebApp } from "meteor/webapp";
import bodyParser from "body-parser";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments";
import { Payments } from "/imports/common/collections/payments";
import { Members } from "/imports/common/collections/members";
import { Memberships } from "/imports/common/collections/memberships";
import {detectPotentialLabPayment} from "/imports/common/lib/rules";
import { v4 as uuidv4 } from 'uuid';



WebApp.handlers.use(bodyParser.json());
WebApp.handlers.use("/swish/callback", async (req, res, next) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Only POST is supported!');
    return;
  }
  const obj = req.body;
  if (obj && typeof obj === 'object') {
    if (obj.status === 'PAID') {
      try {
      const initiated = await initiatedPayments.findOneAsync({ swishID: obj.id });
        if (!initiated) {
          res.writeHead(404);
          res.end('Payment not found!');
          return;
        }
        initiatedPayments.updateAsync(
          { swishID: obj.id }, 
          { $set: { status: "PAID" , createdAt: obj.datePaid}}
        );
        const member = await Members.findOneAsync(initiated.member);
        const payment = await addPayment( {
          type: "swish",
          amount: Number(initiated.amount),
          date: initiated.createdAt,
          name: member.name,
          mobile: member.mobile,
          member: member._id,
        })
        await addMembership(payment, member, initiated);

        res.writeHead(200);
        res.end('Success!');
        return;
      } catch(err) {
        console.error(err);
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
    } else {
      res.end('Failure!');
      return;
    }
  } else {
    res.writeHead(400)
    res.end();
    return;
  }
});

const addPayment = async (paymentData) => {
    const hash = uuidv4().replace(/-/g, "").substring(0, 40);
    const id = Payments.insertAsync({
      ...paymentData,
      date: new Date(),
      hash,
    });
    return paymentData;
};
const addMembership = async (payment, member, initiated) => {
  const doc = membershipFromPayment(payment.date, initiated.paymentType, member.member == null, detectPotentialLabPayment(member)); //Göra om denna metod så den kollar på paymentType i initiatedPayment
  const membershipData = {
    mid: member._id,
    pid: payment._id,
    type: doc.type,
    family: doc.family,
    discount: doc.discount,
    labend: doc.labend,
    memberend: doc.memberend,
    amount: payment.amount,
    start: new Date(),
  };
  const membershipId = await Memberships.insertAsync(membershipData);

  return {
    id: membershipId,
    mid: membershipData.mid,
  };
  }

  const membershipFromPayment = (paymentDate, paymentType, first, potentialLabPayment) => {
    const start = new Date(paymentDate);
    let labend = new Date(paymentDate);
    let memberend = new Date(paymentDate);
    console.log(memberend);
    let type = 'member';
    let family = false;
    let discount = false;
    memberend.setDate(labend.getDate() + (first ? 14 : 7));
    labend.setDate(labend.getDate() + (first ? 14 : 7));
    switch (paymentType) {
      case "Rabatterat medlemskap":
      case "Discounted membership":
        discount = true;
        memberend.setFullYear(memberend.getFullYear() + 1);
        labend = undefined;
        break;
      case "Medlemskap Bas":
      case "Basic membership":
        memberend.setFullYear(memberend.getFullYear() + 1);
        labend = undefined;
        break;
      case "Familjemedlemskap":
      case "Family lab member":
        family = true;
        memberend.setFullYear(memberend.getFullYear() + 1);
        labend = undefined;
        break;
      case "Kvartalslabbmedlemskap":
      case "Quarterly lab membership":
        labend.setMonth(labend.getMonth() + 3);
        //memberend = undefined;  Varför undefined?
        memberend.setMonth(labend.getMonth() + 3);
        type = 'lab';
        family = false;
        break;
      case "Rabatterat Labbmedlemskap":
      case "Discounted lab membership":
        labend.setMonth(labend.getMonth() + 12);
        memberend.setFullYear(memberend.getFullYear() + 1);
        type = 'labandmember';
        family = false;
        discount = true;
        break;
      case "Labbmedlem Individ":
      case "Individual lab member":
        labend.setMonth(labend.getMonth() + 12);
        memberend.setFullYear(memberend.getFullYear() + 1);
        type = 'labandmember';
        family = false;
        discount = false;
        break;
      case "Labbmedlem Familj":
      case "Familiy membership":
        labend.setMonth(labend.getMonth() + 12);
        memberend.setFullYear(memberend.getFullYear() + 1);
        type = 'labandmember';
        family = true;
        discount = false;
        break;
    }
    return {
      start,
      labend,
      memberend,
      type,
      discount,
      family,
    }
  }

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
