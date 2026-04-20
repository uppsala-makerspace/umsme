import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";
import { PushSubs } from "/imports/common/collections/pushSubs";
import { Members } from "/imports/common/collections/members";
import { findMemberForUser } from "./utils";
import { applyDefaults } from "/imports/lib/notificationCategories";
import { initPush, sendPushToSubscriptions } from "/imports/common/server/push";

Meteor.startup(() => {
  initPush();
});

export { sendPushToSubscriptions };

Meteor.methods({
  async savePushSubscription(sub) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      throw new Meteor.Error("invalid-sub", "Subscription missing required fields");
    }

    const existing = await PushSubs.findOneAsync({ endpoint: sub.endpoint });
    if (existing) {
      await PushSubs.updateAsync(existing._id, {
        $set: { userId: this.userId, keys: sub.keys, expirationTime: sub.expirationTime },
      });
    } else {
      await PushSubs.insertAsync({
        userId: this.userId,
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: sub.keys,
        createdAt: new Date(),
      });
    }
  },

  async removePushSubscription(endpoint) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    await PushSubs.removeAsync({ endpoint, userId: this.userId });
  },

  async updateNotificationPrefs(prefs) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("no-member", "No member found for user");
    }
    await Members.updateAsync(member._id, {
      $set: { notificationPrefs: prefs },
    });
  },

  async getNotificationPrefs() {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    const member = await findMemberForUser();
    return applyDefaults(member?.notificationPrefs);
  },

  async sendTestNotification() {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }

    if (!(await Roles.userIsInRoleAsync(this.userId, ["admin", "admin-locks"]))) {
      throw new Meteor.Error("not-authorized", "Admin only");
    }

    const subs = await PushSubs.find({ userId: this.userId }).fetchAsync();
    if (!subs.length) {
      throw new Meteor.Error("no-subs", "No push subscriptions found");
    }

    const payload = {
      title: { sv: "Testavisering", en: "Test notification" },
      body: {
        sv: "Detta är en testavisering från UMS.",
        en: "This is a test notification from UMS.",
      },
      category: "testNotification",
      timestamp: Date.now(),
    };

    await new Promise((resolve) => setTimeout(resolve, 4000));
    await sendPushToSubscriptions(subs, payload);
  },
});
