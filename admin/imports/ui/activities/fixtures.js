// What the stories show: a group, activities, events and categories.
export const groups = [{ _id: 'g1', name: { sv: 'Styrgrupp Trä' }, type: 'steering' }, { _id: 'g2', name: { sv: 'Fikagruppen' }, type: 'function' }];
export const groupName = (id) => groups.find((g) => g._id === id)?.name?.sv;
export const categories = [{ _id: 'c1', name: { sv: 'Introduktion', en: 'Introduction' }, sortOrder: 1 }, { _id: 'c2', name: { sv: 'Socialt', en: 'Social' }, sortOrder: 2 }];
export const workshopOptions = [{ value: 'w1', label: 'Träverkstaden' }, { value: 'w2', label: 'Retrodatorer' }];
export const spaceOptions = [{ value: 's1', label: 'Träverkstaden (Floor 1)' }, { value: 's2', label: 'Stora rummet (Floor 1)' }];
export const intro = {
  _id: 'a1', name: { sv: 'Introduktion träverkstaden', en: 'Woodshop introduction' }, description: { sv: 'Säkerhet och maskiner.' },
  groupId: 'g1', categoryId: 'c1', workshopId: 'w1', spaceId: 's1', durationMinutes: 120, membersOnly: true, published: true,
};
export const fika = { _id: 'a2', name: { sv: 'Pysselfika' }, groupId: 'g2', categoryId: 'c2', durationMinutes: 180, membersOnly: false };
export const activities = [intro, fika];
const at = (d, h) => new Date(2026, 10, d, h, 0);
export const now = new Date(2026, 10, 10, 12, 0);
export const events = [
  { _id: 'e1', activityId: 'a1', groupId: 'g1', start: at(5, 18), end: at(5, 20), status: 'confirmed', hostMemberIds: ['m1'] },
  { _id: 'e2', activityId: 'a1', groupId: 'g1', start: at(19, 18), end: at(19, 20), status: 'confirmed', hostMemberIds: ['m1', 'm2'] },
  { _id: 'e3', activityId: 'a2', groupId: 'g2', start: at(22, 14), end: at(22, 17), status: 'cancelled', hostMemberIds: [] },
  { _id: 'e4', name: { sv: 'Städdag' }, start: at(29, 10), end: at(29, 15), status: 'confirmed', hostMemberIds: [] },
];
export const hosts = [{ _id: 'm1', name: 'Alice Andersson', mid: '101' }, { _id: 'm2', name: 'Bertil Berg', mid: '102' }];
