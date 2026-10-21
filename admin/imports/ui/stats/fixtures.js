/** Made-up memberships and payments for the statistics stories: three years of a small makerspace. */
const DAY = 24 * 60 * 60 * 1000;
const TYPES = ['member', 'labandmember', 'labandmember', 'member', 'labandmember'];

export const storyNow = new Date(2026, 9, 15);

export const storyMemberships = (() => {
  const list = [];
  for (let m = 0; m < 60; m += 1) {
    const type = TYPES[m % TYPES.length];
    let start = new Date(storyNow.getTime() - (1100 - m * 13) * DAY);
    for (let year = 0; year < 3 && start < storyNow; year += 1) {
      const end = new Date(start.getTime() + 365 * DAY);
      list.push({ _id: `ms${m}-${year}`, mid: `m${m}`, type, family: m % 7 === 0, start, memberend: end, ...(type === 'labandmember' ? { labend: end } : {}) });
      if (m % 4 === 0) break;
      start = new Date(end.getTime() + (m % 3) * 10 * DAY);
    }
  }
  return list;
})();

export const storyMembers = [...new Set(storyMemberships.map((ms) => ms.mid))].map((mid, i) => {
  const ends = storyMemberships.filter((ms) => ms.mid === mid).map((ms) => ms.memberend);
  const member = new Date(Math.max(...ends));
  return { _id: mid, name: `Medlem ${i + 1}`, email: `medlem${i + 1}@example.org`, member, ...(i % 2 ? { lab: member } : {}), family: i % 7 === 0 };
});

export const storyPayments = storyMemberships.map((ms, i) => ({
  _id: `p${i}`, membership: ms._id, date: ms.start, amount: ms.type === 'labandmember' ? 1600 : 200,
}));
