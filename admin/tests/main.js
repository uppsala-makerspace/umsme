import assert from "assert";
import "./accounting.tests";
import "./stats.tests";
import "./expenseApproval.tests";
import "./slug.tests";
import "./publicDirectory.tests";
import "./storeRules.tests";
import "./familyRules.tests";
import "./revenueSeries.tests";
import "./groupRules.tests";
import "./storageRules.tests";
import "./storageDigest.tests";
import "./storageMessages.tests";
import "./storageMigration.tests";
import "./storageService.tests";
import "./storageServiceDb.tests";
import "./storageIndexes.tests";
import "./storagePresentation.tests";

describe("umsme", function () {
  it("package.json has correct name", async function () {
    const { name } = await import("../package.json");
    assert.strictEqual(name, "umsme");
  });

  if (Meteor.isClient) {
    it("client is not server", function () {
      assert.strictEqual(Meteor.isServer, false);
    });
  }

  if (Meteor.isServer) {
    it("server is not client", function () {
      assert.strictEqual(Meteor.isClient, false);
    });
  }
});
