// prettier-ignore

import { Meteor } from "meteor/meteor";
import { PushSubs } from "/collections/pushSubs";
import webpush from "web-push";

Meteor.startup(() => {
  webpush.setVapidDetails(
    "mailto:admin@example.com",
    Meteor.settings.public.vapidPublicKey,
    Meteor.settings.private.vapidPrivateKey
  );
});

Meteor.methods({
  async savePushSubscription(sub) {
    console.log("🔔 Mottar subscription från klient:", sub);

    try {
      if (!sub?.endpoint)
        throw new Meteor.Error("invalid-sub", "Subscription saknar endpoint");

      const existing = await PushSubs.findOneAsync({ endpoint: sub.endpoint }); // 🔧 Synkron version

      if (!existing) {
        await PushSubs.insertAsync(sub);
        console.log("✅ Subscription sparad för userID:", sub.userId);
      } else {
        console.log("ℹ️ Subscription fanns redan.");
      }
    } catch (err) {
      console.error("❌ Fel i savePushSubscription:", err);
      throw new Meteor.Error("save-failed", err.message);
    }
  },

  sendPush(title, body) {
    console.log("serever::: Skickar push-notis:", title, body);
    const payload = JSON.stringify({ title, body });

    const allSubs = PushSubs.find().fetch();
    console.log("🧾 Antal prenumerationer:", allSubs.length);

    PushSubs.find().forEach((doc) => {
      console.log("in for each loop");
      const sub = {
        endpoint: doc.endpoint,
        expirationTime: doc.expirationTime,
        keys: {
          p256dh: doc.keys.p256dh,
          auth: doc.keys.auth,
        },
      };
      console.log("nice stage");

      webpush
        .sendNotification(sub, payload)
        .then(() => {
          console.log("✅ Push skickad till:", sub.endpoint);
        })
        .catch((err) => {
          console.error("❌ Push-fel till:", sub.endpoint);
          console.error(err);
        });
    });
  },
});
Meteor.startup(() => {
  const subs = PushSubs.find().fetch();
  console.log("Prenumerationer i DB:", subs);
});
