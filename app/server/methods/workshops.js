import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { Certificates } from "/imports/common/collections/certificates";
import { Spaces } from "/imports/common/collections/spaces";
import { StoreItems } from "/imports/common/collections/storeItems";
import { staffingOf } from "/imports/common/lib/groupRules";
import { activityLinks, activitiesAtSelector, upcomingEventsAt } from "./activities";
import { workshopImageUrlFor, spaceIconUrlFor } from "/imports/common/server/workshopImage";
import { setEntityImage, clearEntityImage } from "/imports/common/server/entityImage";
import {
  findMemberForUser,
  canEditWorkshop,
  canSeeWorkshopRevenue,
  applyWhitelistedUpdate,
  spacesMapView,
  requestsToApprove,
} from "./utils";

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) {
    throw new Meteor.Error("not-found", "Member not found");
  }
  return member;
};

// Group summary for the workshop page's group lists: active member count and
// the caller's own membership state and responsibility, like groups.list provides.
const groupSummary = async (groupDoc, memberId, toApprove = new Map()) => {
  const memberCount = await GroupMemberships.find({
    groupId: groupDoc._id,
    state: "active",
  }).countAsync();
  return {
    _id: groupDoc._id,
    name: groupDoc.name,
    type: groupDoc.type,
    memberCount,
    // Looking for members, or full (staffingOf in common/lib/groupRules.js).
    staffing: staffingOf(groupDoc, memberCount),
    myState:
      (await GroupMemberships.findOneAsync({ groupId: groupDoc._id, memberId }))
        ?.state || null,
    myIsResponsible: groupDoc.responsibleMemberId === memberId,
    // Join requests waiting for the caller's approval (requestsToApprove).
    myRequestsToApprove: toApprove.get(groupDoc._id) || 0,
  };
};

const publicWorkshopFields = (workshop) => ({
  _id: workshop._id,
  kind: workshop.kind || "workshop",
  name: workshop.name,
  description: workshop.description,
  rules: workshop.rules,
  status: workshop.status,
  slackChannel: workshop.slackChannel,
  guidesUrl: workshop.guidesUrl,
  groupId: workshop.groupId,
  imageUrl: workshopImageUrlFor(workshop),
});

Meteor.methods({
  /**
   * All workshops for the member-facing workshop view (every status — the UI
   * badges trial/forming/decommissioned).
   */
  "workshops.list": async () => {
    await requireMember();
    const workshops = await Workshops.find({}, { sort: { "name.sv": 1 } }).fetchAsync();
    // Attach the primary space's icon (a workshop with a primary space has
    // one) for the list cards.
    const spaceIds = [...new Set(workshops.map((w) => w.primarySpaceId).filter(Boolean))];
    const spaces = spaceIds.length
      ? await Spaces.find({ _id: { $in: spaceIds } }).fetchAsync()
      : [];
    const iconById = new Map(spaces.map((s) => [s._id, spaceIconUrlFor(s)]));
    return workshops.map((w) => ({
      ...publicWorkshopFields(w),
      spaceIconUrl: w.primarySpaceId ? iconById.get(w.primarySpaceId) || null : null,
    }));
  },

  /**
   * More of a workshop's events to come, after the first `skip`: the page's
   * Load more events.
   */
  "workshops.upcomingEvents": async (workshopId, skip) => {
    check(workshopId, String);
    check(skip, Match.Integer);
    const member = await requireMember();
    if (!(await Workshops.findOneAsync(workshopId, { fields: { _id: 1 } }))) {
      throw new Meteor.Error("not-found", "Workshop not found");
    }
    return upcomingEventsAt(workshopId, member._id, { skip });
  },

  /**
   * One workshop plus its responsible group and linked certificates.
   */
  "workshops.getDetails": async (workshopId) => {
    const member = await requireMember();
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) {
      throw new Meteor.Error("not-found", "Workshop not found");
    }

    // The responsible steering group and its responsibility subgroups, for
    // the "get involved" list.
    const toApprove = await requestsToApprove(member);
    let group = null;
    const responsibilityGroups = [];
    if (workshop.groupId) {
      const groupDoc = await Groups.findOneAsync(workshop.groupId);
      if (groupDoc) {
        group = await groupSummary(groupDoc, member._id, toApprove);
        const children = await Groups.find(
          { parentGroupId: groupDoc._id },
          { sort: { "name.sv": 1 } }
        ).fetchAsync();
        for (const child of children) {
          responsibilityGroups.push(await groupSummary(child, member._id, toApprove));
        }
      }
    }

    // Groups that declared this workshop as related (e.g. a function group
    // that partly operates here).
    const relatedGroups = [];
    const related = await Groups.find(
      { relatedWorkshopIds: workshopId },
      { sort: { "name.sv": 1 } }
    ).fetchAsync();
    for (const relatedGroup of related) {
      relatedGroups.push(await groupSummary(relatedGroup, member._id, toApprove));
    }

    const certificates = (
      await Certificates.find({ workshopId }, { sort: { "name.sv": 1 } }).fetchAsync()
    ).map((c) => ({ _id: c._id, name: c.name, mandatory: c.mandatory }));
    // Its calendar: the first page of the events to come, its own and its activities'.
    const upcoming = await upcomingEventsAt(workshopId, member._id);

    return {
      workshop: publicWorkshopFields(workshop),
      group,
      responsibilityGroups,
      relatedGroups,
      certificates,
      // The activities shown at it, to link to.
      activities: await activityLinks(await activitiesAtSelector(workshopId)),
      upcomingEvents: upcoming.events,
      upcomingEventsMore: upcoming.more,
      mapView: await spacesMapView(workshop),
      canEdit: await canEditWorkshop(member, workshop),
      // Only offered when the web shop sells something for the workshop.
      canSeeRevenue:
        (await StoreItems.find({ workshopIds: workshopId }).countAsync()) > 0
        && (await canSeeWorkshopRevenue(member, workshop)),
    };
  },

  /**
   * Edit descriptive fields of a workshop. The workshop's own group decides who
   * may: its responsible, or anyone in it when it is a steering group. Only the
   * whitelisted fields
   * (description, Slack channel, guides URL); name, status and spaces are
   * off limits.
   */
  "workshops.updateByResponsible": async (workshopId, patch) => {
    const member = await requireMember();
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) {
      throw new Meteor.Error("not-found", "Workshop not found");
    }
    if (!(await canEditWorkshop(member, workshop))) {
      throw new Meteor.Error("not-authorized", "You are not responsible for this workshop");
    }
    const p = patch || {};
    await applyWhitelistedUpdate(Workshops, workshopId, {
      "description.sv": p.description?.sv,
      "description.en": p.description?.en,
      "rules.sv": p.rules?.sv,
      "rules.en": p.rules?.en,
      slackChannel: p.slackChannel,
      guidesUrl: p.guidesUrl,
    });
    return true;
  },

  /** Set/replace the workshop's image (see canEditWorkshop). */
  "workshops.uploadImageByResponsible": async (workshopId, imageBase64, mimeType) => {
    const member = await requireMember();
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) {
      throw new Meteor.Error("not-found", "Workshop not found");
    }
    if (!(await canEditWorkshop(member, workshop))) {
      throw new Meteor.Error("not-authorized", "You are not responsible for this workshop");
    }
    return setEntityImage(Workshops, workshop, {
      imageBase64,
      mimeType,
      baseName: `workshop-${workshopId}-${Date.now()}`,
    });
  },

  /** Remove the workshop's image (see canEditWorkshop). */
  "workshops.removeImageByResponsible": async (workshopId) => {
    const member = await requireMember();
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) {
      throw new Meteor.Error("not-found", "Workshop not found");
    }
    if (!(await canEditWorkshop(member, workshop))) {
      throw new Meteor.Error("not-authorized", "You are not responsible for this workshop");
    }
    return clearEntityImage(Workshops, workshop);
  },
});
