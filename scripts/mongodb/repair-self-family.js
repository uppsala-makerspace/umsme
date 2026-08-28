// Repair members who ended up in their own family, and family flags that were
// lost when a family add-on shared its base membership's end date.
//
// Run through repair-self-family.sh, which sets APPLY. Dry run by default.
//
// Standalone by necessity: this runs with mongosh against the deployed
// database, without the Meteor app. It therefore
//   * duplicates the rule in common/lib/familyRules.js — keep the two in step, and
//   * bypasses Collection2 and the hooks in common/server/familyCascade.js,
//     which is why dependents are resynced explicitly.
//
// Every finding is computed against the state *after* the repair, so a dry run
// reports exactly what --apply will write. Nothing is deleted and no member is
// detached from a family: where the data says something this script should not
// decide on its own, it reports and leaves the document alone.

const APPLY = globalThis.APPLY === true;

const members = db.members.find({}).toArray();
const byId = Object.fromEntries(members.map((m) => [m._id, m]));
const ownMemberships = {};
db.membership.find({}, { mid: 1, memberend: 1, family: 1 }).forEach((ms) => {
  (ownMemberships[ms.mid] = ownMemberships[ms.mid] || []).push(ms);
});

// Mirrors familyFromMemberships in common/lib/familyRules.js: the latest
// memberend decides which memberships are in play, and a family flag on any of
// them wins. A tie must not be resolved by document order.
function familyFromMemberships(list) {
  let latest = null;
  for (const ms of list) {
    if (!ms.memberend) continue;
    if (!latest || ms.memberend > latest) latest = ms.memberend;
  }
  if (!latest) return false;
  return list.some(
    (ms) => ms.memberend && ms.memberend.getTime() === latest.getTime() && ms.family === true,
  );
}

const selfFamily = members.filter((m) => m.infamily && m.infamily === m._id);
const orphaned = members.filter((m) => m.infamily && m.infamily !== m._id && !byId[m.infamily]);

// A self-family member is really a payer, so judge them as they will be once
// their infamily is gone.
const isPayer = (m) => !m.infamily || m.infamily === m._id;
const flagFixes = [];
const familyAfter = {};
for (const m of members) {
  if (!isPayer(m)) continue;
  const want = familyFromMemberships(ownMemberships[m._id] || []);
  familyAfter[m._id] = want;
  if (want !== (m.family === true)) flagFixes.push({ m, want });
}

// Dependents mirror their payer's member/lab/family (familyCascade Hook A),
// and those hooks do not run here. Compared against the payer's repaired values.
const same = (a, b) => (a && b ? a.getTime() === b.getTime() : !a && !b);
const drift = [];
for (const m of members) {
  if (!m.infamily || m.infamily === m._id) continue;
  const payer = byId[m.infamily];
  if (!payer) continue; // reported as orphaned
  const wantFamily = familyAfter[payer._id] === true;
  if (same(m.member, payer.member) && same(m.lab, payer.lab) && (m.family === true) === wantFamily) continue;
  drift.push({ m, payer, wantFamily });
}

// A payer with dependents but no family membership is left alone on purpose:
// detaching people is not a decision this script should make.
const odd = members.filter(
  (m) => isPayer(m) && familyAfter[m._id] !== true &&
    members.some((x) => x.infamily === m._id && x._id !== m._id),
);

const d = (x) => (x ? x.toISOString().slice(0, 10) : "-");

print("=== 1. medlemmar i sin egen familj (infamily === _id) ===");
if (!selfFamily.length) print("   inga");
selfFamily.forEach((m) => print("   " + m._id + "  " + m.name + "   -> $unset infamily"));

print("");
print("=== 2. family-flaggor som ska rättas ===");
if (!flagFixes.length) print("   inga");
flagFixes.forEach(({ m, want }) => {
  print("   " + m._id + "  " + (m.name || "?") + "   family: " + m.family + " -> " + want);
  (ownMemberships[m._id] || [])
    .filter((ms) => ms.memberend)
    .sort((a, b) => a.memberend - b.memberend)
    .forEach((ms) => print("        memberend=" + d(ms.memberend) + "  family=" + ms.family));
});

print("");
print("=== 3. familjemedlemmar som ska synkas mot den betalande ===");
if (!drift.length) print("   inga");
drift.forEach(({ m, payer, wantFamily }) =>
  print("   " + m._id + "  " + m.name + "  (i " + payer.name + "s familj)" +
        "   family: " + m.family + " -> " + wantFamily +
        "   member: " + d(m.member) + " -> " + d(payer.member) +
        "   lab: " + d(m.lab) + " -> " + d(payer.lab)));

if (orphaned.length) {
  print("");
  print("=== VARNING: infamily pekar på en medlem som inte finns (rättas inte) ===");
  orphaned.forEach((m) => print("   " + m._id + "  " + m.name + "  -> " + m.infamily));
}
if (odd.length) {
  print("");
  print("=== VARNING: betalande utan familjemedlemskap men med familjemedlemmar (rättas inte) ===");
  odd.forEach((m) => print("   " + m._id + "  " + m.name));
}

print("");
if (!APPLY) {
  print("TORRKÖRNING — inget har ändrats. Kör med --apply för att skriva.");
} else {
  print("=== skriver ===");
  // Order matters: infamily first, so a repaired member counts as the payer
  // they are; then their flag; then the dependents that mirror it.
  for (const m of selfFamily) {
    db.members.updateOne({ _id: m._id }, { $unset: { infamily: "" } });
    print("   infamily borttaget: " + m.name);
  }
  for (const { m, want } of flagFixes) {
    db.members.updateOne({ _id: m._id }, { $set: { family: want } });
    print("   family=" + want + ": " + m.name);
  }
  for (const { m, payer, wantFamily } of drift) {
    db.members.updateOne(
      { _id: m._id },
      { $set: { member: payer.member, lab: payer.lab, family: wantFamily } },
    );
    print("   synkad mot " + payer.name + ": " + m.name);
  }
  print("");
  print("KLART — " + (selfFamily.length + flagFixes.length + drift.length) + " dokument skrivna.");
}
