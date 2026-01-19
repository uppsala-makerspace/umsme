import { Meteor } from "meteor/meteor";
import { LiabilityDocuments } from "/imports/common/collections/liabilityDocuments";
import { Members } from "/imports/common/collections/members";
import { findForUser } from "/server/methods/utils";

Meteor.methods({
  /**
   * Retrieves a list of all liability documents with title and date only.
   * @returns {Promise<Array<{ _id: string, title: string, date: Date }>>}
   */
  async liabilityDocumentsList() {
    return await LiabilityDocuments.find(
      {},
      {
        fields: { title: 1, date: 1 },
        sort: { date: -1 },
      }
    ).fetchAsync();
  },

  /**
   * Fetches a specific liability document by its date.
   * @param {Date} date - The date of the document to fetch
   * @returns {Promise<{ _id: string, title: string, date: Date, text: string } | null>}
   */
  async liabilityDocumentByDate(date) {
    if (!date || !(date instanceof Date)) {
      throw new Meteor.Error("invalid-argument", "A valid date is required");
    }

    return await LiabilityDocuments.findOneAsync({ date });
  },

  /**
   * Approves a liability document for the current user.
   * Sets the liabilityDate on the member to the date of the approved document.
   * @param {Date} date - The date of the liability document to approve
   * @returns {Promise<{ success: boolean }>}
   */
  async approveLiability(date) {
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    if (!date || !(date instanceof Date)) {
      throw new Meteor.Error("invalid-argument", "A valid date is required");
    }

    // Verify the document exists
    const document = await LiabilityDocuments.findOneAsync({ date });
    if (!document) {
      throw new Meteor.Error("not-found", "Liability document not found");
    }

    const { member } = await findForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "No member found for user");
    }

    // Use document.date from the database to ensure exact match for comparison
    await Members.updateAsync(member._id, {
      $set: { liabilityDate: document.date },
    });

    return { success: true };
  },
});
