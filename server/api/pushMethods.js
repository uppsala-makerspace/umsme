// prettier-ignore

import { Meteor } from "meteor/meteor";
import { PushSubs } from "/collections/pushSubs";
import { Members } from "/collections/members";
import { Memberships } from "/collections/memberships";

import webpush from "web-push";

const daysLeftWhenNotified = 20; // = daysLeftOfLab on the loggedinasmember page + 1

Meteor.startup(() => {
  webpush.setVapidDetails(
    "mailto:admin@example.com",
    Meteor.settings.public.vapidPublicKey,
    Meteor.settings.private.vapidPrivateKey
  );
});

Meteor.methods({
  async notifyExpiringMemberships() {
    const today = new Date();
    const deadline = new Date();
    deadline.setDate(today.getDate() + daysLeftWhenNotified);
    console.log("Deadline för notifiering:", deadline);

    const allSubs = await PushSubs.find({}).fetch();

    for await (const sub of allSubs) {
      const userId = sub.userId;
      const user = await Meteor.users.findOneAsync({ _id: userId });
      const email = user?.emails?.[0]?.address;

      let member;
      if (user?.emails?.[0]?.verified) {
        member = Members.findOneAsync({ email });
      }
      if (!member) continue; // meber is a promise here so it is always true. I get problems with Await when finding members for some reason :(
      const memberships = await Memberships.find({
        mid: member._id,
      }).fetchAsync();

      if (!Array.isArray(memberships)) continue;

      const hasExpiring = memberships.some((m) => {
        if (!m.memberend) return false;
        const endDate = new Date(m.memberend);
        return (
          endDate.getFullYear() === deadline.getFullYear() &&
          endDate.getMonth() === deadline.getMonth() &&
          endDate.getDate() === deadline.getDate()
        );
      });
      if (!hasExpiring) continue;

      const payload = JSON.stringify({
        title: "Medlemskap löper ut om " + daysLeftWhenNotified + " dagar",
        body: "Förnya gärna för att behålla ditt medlemskap!",
      });

      await webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload
        )
        .then(() => console.log("Push skickad till", sub.userId))
        .catch((err) => console.error(" Push-fel till", sub.userId, err));
    }
  },

  async savePushSubscription(sub) {
    try {
      if (!sub?.endpoint)
        throw new Meteor.Error("invalid-sub", "Subscription saknar endpoint");

      const existing = await PushSubs.findOneAsync({ endpoint: sub.endpoint }); // Synkron version

      if (!existing) {
        await PushSubs.insertAsync(sub);
      } else {
      }
    } catch (err) {
      throw new Meteor.Error("save-failed", err.message);
    }
  },

  sendPush(title, body) {
    const payload = JSON.stringify({ title, body });

    const allSubs = PushSubs.find().fetch();

    PushSubs.find().forEach((doc) => {
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
          console.log("Push skickad till:", sub.endpoint);
        })
        .catch((err) => {
          console.error("Push-fel till:", sub.endpoint);
          console.error(err);
        });
    });
  },
});
Meteor.startup(() => {
  const subs = PushSubs.find().fetch();
  console.log("Prenumerationer i DB:", subs);
});
