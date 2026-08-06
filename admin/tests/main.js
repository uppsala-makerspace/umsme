import assert from "assert";
import "./accounting.tests";
import "./stats.tests";
import "./expenseApproval.tests";
import "./slug.tests";
import "./publicDirectory.tests";

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
