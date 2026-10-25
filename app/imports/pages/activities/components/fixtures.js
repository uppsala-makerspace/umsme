// What the stories show.
const at = (d, h, m = 0) => new Date(2026, 10, d, h, m);
export const intro = {
  _id: "a1", name: { sv: "Introduktion träverkstaden", en: "Wood workshop introduction" },
  description: { sv: "Säkerhet, maskiner och rutiner i **träverkstaden**." },
  groupId: "g1", groupName: { sv: "Styrgrupp Träverkstaden" }, categoryName: { sv: "Kurs och introduktion" },
  workshopId: "w1", workshopName: { sv: "Träverkstaden" }, spaceName: { sv: "Träverkstaden" },
  slackChannel: "traverkstaden", contactEmail: null, durationMinutes: 120, cost: null, membersOnly: true, imageUrl: null,
};
export const fika = {
  _id: "a2", name: { sv: "Pysselfika" }, description: { sv: "Ta med ett projekt." }, groupId: "g2",
  groupName: { sv: "Lokalgruppen" }, categoryName: { sv: "Socialt" }, spaceName: { sv: "Stora rummet" },
  durationMinutes: 180, cost: 20, membersOnly: false, imageUrl: null,
};
export const events = [
  { ...intro, _id: "e1", activityId: "a1", start: at(19, 18), end: at(19, 20), status: "confirmed", hostMemberIds: ["m1"] },
  { ...fika, _id: "e2", activityId: "a2", start: at(22, 14), end: at(22, 17), status: "cancelled", hostMemberIds: [] },
  { _id: "e3", name: { sv: "Städdag" }, description: { sv: "Vi städar tillsammans." }, groupName: { sv: "Lokalgruppen" },
    spaceName: { sv: "Stora rummet" }, start: at(29, 10), end: at(29, 15), status: "confirmed", hostMemberIds: ["m1", "m2"], membersOnly: false },
];
export const hosts = [{ _id: "m1", name: "Alice Andersson" }, { _id: "m2", name: "Bertil Berg" }];
export const choices = {
  adminish: false,
  groups: [{ _id: "g1", name: { sv: "Styrgrupp Träverkstaden" }, edit: true, book: true }, { _id: "g2", name: { sv: "Lokalgruppen" }, edit: false, book: true }],
  activities: [{ _id: "a1", name: intro.name, groupId: "g1", durationMinutes: 120 }, { _id: "a2", name: fika.name, groupId: "g2", durationMinutes: 180 }],
  categories: [{ _id: "c1", name: { sv: "Kurs och introduktion" } }, { _id: "c2", name: { sv: "Socialt" } }],
  workshops: [{ _id: "w1", name: { sv: "Träverkstaden" } }],
  spaces: [{ _id: "s1", name: { sv: "Träverkstaden" } }, { _id: "s2", name: { sv: "Stora rummet" } }],
};
