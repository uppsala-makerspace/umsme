import { initiatedPayments } from "/imports/common/collections/initiatedPayments";

/**
 * Mark INITIATED payments of the given type as EXPIRED if they are older than
 * `expirySeconds`. Returns the number of rows updated.
 *
 * Pure-ish: only depends on the initiatedPayments collection and a clock.
 * Used by the admin cron job and called directly from payment-side tests.
 */
export const expireStaleInitiatedPayments = async ({ paymentType, expirySeconds }) => {
  const expiryTime = new Date(Date.now() - expirySeconds * 1000);
  return await initiatedPayments.updateAsync(
    {
      status: "INITIATED",
      paymentType,
      createdAt: { $lt: expiryTime },
    },
    {
      $set: {
        status: "EXPIRED",
        resolvedAt: new Date(),
      },
    },
    { multi: true }
  );
};
