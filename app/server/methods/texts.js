import { Meteor } from "meteor/meteor";
import { loadText, loadJson } from "/imports/common/server/configLoader";
import { Spaces } from "/imports/common/collections/spaces";
import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import {
  spaceIconUrlFor,
  workshopImageUrlFor,
  groupImageUrlFor,
} from "/imports/common/server/workshopImage";

const TERMS_DEFAULT_ASSET = {
  termsOfPurchaseMembershipEn: "termsOfPurchaseMembership.en.md",
  termsOfPurchaseMembershipSv: "termsOfPurchaseMembership.sv.md",
};

Meteor.methods({
  /**
   * Get terms of purchase for membership purchases.
   * @param {string} lang - Language code ('en' or 'sv')
   * @returns {string} Markdown content
   */
  async "texts.termsOfPurchaseMembership"(lang = "en") {
    const settingKey = lang === "sv" ? "termsOfPurchaseMembershipSv" : "termsOfPurchaseMembershipEn";
    return await loadText(settingKey, TERMS_DEFAULT_ASSET[settingKey]);
  },

  /**
   * Map data for the app, in the shape the map component expects
   * ({ floor1: { spaceId: {...} }, floor2: {...} }). Built solely from the
   * Spaces collection (managed in admin, seeded via its import) — before the
   * import has run the map simply has no markers. Each room also carries
   * preview data for the workshops and groups linked to the space, shown in
   * the map popup.
   */
  async "data.rooms"() {
    const spaces = await Spaces.find({}).fetchAsync();

    // Resolve linked workshops/groups once and index them by space _id
    // (the linking fields store space document ids).
    const linkSelector = {
      $or: [{ primarySpaceId: { $exists: true } }, { secondarySpaceIds: { $exists: true } }],
    };
    const bySpace = {};
    const addLink = (kind, spaceDbId, entry) => {
      if (!spaceDbId) return;
      bySpace[spaceDbId] = bySpace[spaceDbId] || { workshops: [], groups: [] };
      bySpace[spaceDbId][kind].push(entry);
    };
    for (const workshop of await Workshops.find(linkSelector).fetchAsync()) {
      const entry = {
        _id: workshop._id,
        name: workshop.name,
        description: workshop.description,
        status: workshop.status,
        imageUrl: workshopImageUrlFor(workshop),
      };
      addLink("workshops", workshop.primarySpaceId, entry);
      for (const id of workshop.secondarySpaceIds || []) addLink("workshops", id, entry);
    }
    // Steering groups are represented by their workshop; the popup previews
    // interest/function/responsibility groups.
    for (const group of await Groups.find({ ...linkSelector, type: { $ne: "steering" } }).fetchAsync()) {
      const entry = {
        _id: group._id,
        name: group.name,
        description: group.description,
        type: group.type,
        imageUrl: groupImageUrlFor(group),
        memberCount: await GroupMemberships.find({
          groupId: group._id,
          state: "active",
        }).countAsync(),
      };
      addLink("groups", group.primarySpaceId, entry);
      for (const id of group.secondarySpaceIds || []) addLink("groups", id, entry);
    }
    const byName = (a, b) => (a.name?.sv || "").localeCompare(b.name?.sv || "", "sv");

    const rooms = { floor1: {}, floor2: {} };
    for (const space of spaces) {
      const links = bySpace[space._id] || { workshops: [], groups: [] };
      rooms[space.floor] = rooms[space.floor] || {};
      rooms[space.floor][space.spaceId] = {
        name: space.name,
        description: space.description,
        slackChannels: space.slackChannels,
        iconUrl: spaceIconUrlFor(space),
        iconSize: space.iconSize,
        // A space corresponds to at most one workshop; it becomes the
        // popup's hero and replaces the space's own information.
        workshop: [...links.workshops].sort(byName)[0] || null,
        groups: [...links.groups].sort(byName),
      };
    }
    return rooms;
  },

  async "data.slackChannels"() {
    return await loadJson("slackChannelsPath", "slack-channels.json");
  },
});
