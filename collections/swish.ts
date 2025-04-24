import fs from "fs";
import https from "https";
import fetch from "node-fetch";
import { Meteor } from "meteor/meteor";

// TypeScript workaround för Meteor Assets
declare const Assets: {
  absoluteFilePath(path: string): string;
  getText(path: string): string;
  getBinary(path: string): ArrayBuffer;
};

Meteor.methods({
  async createSwishPayment(instructionUUID: string, paymentData: any) {
    this.unblock();

    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(Assets.absoluteFilePath("swishcert.pem")),
      key: fs.readFileSync(Assets.absoluteFilePath("swishkey.key")),
      ca: fs.readFileSync(Assets.absoluteFilePath("swishTls.pem")),
      secureProtocol: "TLSv1_2_method",
    });

    const url = `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/${instructionUUID}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
      agent: httpsAgent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Meteor.Error(`Swish error: ${response.status}`, errorText);
    }

    return await response.text();
  },
});
