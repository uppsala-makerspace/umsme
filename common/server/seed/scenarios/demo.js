/**
 * The demo scenario: a realistic association to explore admin and the app
 * with. Around 200 members with three years of history, every admin role,
 * groups and workshops, certificates, storage, expenses, a web shop, mails
 * and door unlocks. See plan/test-strategy.md.
 *
 * External services are off in demo, so what they would have produced (bank
 * rows to match, Swish payments, door unlocks, sent mails) is seeded here.
 */
import { Members } from '/imports/common/collections/members';
import { Payments } from '/imports/common/collections/payments';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Workshops } from '/imports/common/collections/workshops';
import { Spaces } from '/imports/common/collections/spaces';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { StoreItems } from '/imports/common/collections/storeItems';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { Expenses } from '/imports/common/collections/expenses';
import { Announcements } from '/imports/common/collections/announcements';
import { Mails } from '/imports/common/collections/mails';
import { Messages } from '/imports/common/collections/messages';
import { Comments } from '/imports/common/collections/comments';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { StorageRequests } from '/imports/common/collections/storage';
import { uploadImage } from '/imports/common/server/googleDrive';
import { daysFromNow, DAY_MS } from '../dates';
import { makeUser } from '../accounts';
import { makeMember, pay, joinFamily, randomHex, PRICES } from '../members';
import { makeStorageWalls, makeStorageUnit } from '../storage';
import { makeMessageTemplate } from '../documents';
import { PERSONAS, PASSWORD, FIRST_FREE_MID } from './personas';
import { makeLiabilityVersions, liabilityFields, makePersonas } from './build';

const BULK_MEMBERS = 175;

export const buildDemo = async ({ random, people, now }) => {
  const days = (n) => daysFromNow(n, now);
  const log = (message) => console.log(`[seed] demo: ${message}`);

  // --- Liability agreement: an older and a current version ----------------
  const liability = await makeLiabilityVersions(days);

  // --- Message templates ----------------------------------------------------
  const template = (fields) => makeMessageTemplate({ created: days(-1000), modified: days(-300), ...fields });
  const welcomeTemplate = await template({
    name: 'Välkommen', type: 'welcome', subject: 'Välkommen till Uppsala Makerspace',
    messagetext: 'Hej <%= name %>!\n\nVälkommen som medlem. Ditt medlemsnummer är <%= mid %>.',
  });
  const confirmationTemplate = await template({
    name: 'Bekräftelse', type: 'confirmation', auto: true, subject: 'Tack för din betalning',
    messagetext: 'Hej <%= name %>!\n\nVi har tagit emot din betalning. Ditt medlemskap gäller till <%= memberEndDate %>.',
  });
  const reminderTemplate = await template({
    name: 'Påminnelse', type: 'reminder', subject: 'Dags att förnya ditt medlemskap',
    messagetext: 'Hej <%= name %>!\n\nDitt medlemskap går ut <%= memberEndDate %>. Förnya i appen.',
  });

  // --- Members ----------------------------------------------------------------
  let midCounter = FIRST_FREE_MID - 1;
  const nextMid = () => String((midCounter += 1));
  const liabilityFor = (state) => liabilityFields(state, liability);

  const { members: personas, userIds: loginUserIds } = await makePersonas(PERSONAS, { people, days, now, liability });
  log(`${Object.keys(personas).length} personas`);

  // Everyone else. Each gets a profile, then a payment history that ends
  // active or expired; a few never paid.
  const profiles = [
    { weight: 30, kind: 'base' },
    { weight: 22, kind: 'lab' },
    { weight: 4, kind: 'quarterly' },
    { weight: 6, kind: 'family' },
    { weight: 30, kind: 'expired' },
    { weight: 5, kind: 'unpaid' },
    { weight: 3, kind: 'excluded' },
  ];
  const totalWeight = profiles.reduce((sum, { weight }) => sum + weight, 0);
  const pickProfile = () => {
    let roll = random.next() * totalWeight;
    return profiles.find(({ weight }) => (roll -= weight) < 0).kind;
  };
  const via = () => (random.chance(0.75) ? 'swish' : 'bankgiro');

  // Yearly payments ending `lastDaysAgo` days ago, starting `years` years before.
  const yearly = async (member, types, lastDaysAgo, years) => {
    for (let year = years; year >= 0; year -= 1) {
      const offset = -(lastDaysAgo + year * 365 + random.int(-10, 20));
      await pay(member, random.pick(types), { at: days(Math.min(offset, -1)), via: via() });
    }
  };

  const bulk = [];
  let bulkCount = 0;
  while (bulkCount < BULK_MEMBERS) {
    const kind = pickProfile();
    const person = people.person();
    const liabilityState = random.chance(0.06) ? 'none' : random.chance(0.12) ? 'outdated' : 'current';
    const member = await makeMember({
      mid: nextMid(),
      name: person.name,
      email: person.email,
      mobile: person.mobile,
      birthyear: person.birthyear,
      gender: random.chance(0.1) ? 'undisclosed' : person.gender,
      ...liabilityFor(liabilityState),
      registered: kind !== 'unpaid' || random.chance(0.5),
      ...(kind === 'excluded' ? { excluded: true } : {}),
    });
    bulkCount += 1;
    const years = random.int(0, 2);
    const recent = random.int(5, 330);
    if (kind === 'base') await yearly(member, ['memberBase', 'memberBase', 'memberBase', 'memberDiscountedBase'], recent, years);
    if (kind === 'lab' || kind === 'excluded') await yearly(member, ['memberLab', 'memberLab', 'memberDiscountedLab'], recent, years);
    if (kind === 'quarterly') {
      await pay(member, 'memberBase', { at: days(-random.int(100, 300)), via: via() });
      await pay(member, 'memberQuarterlyLab', { at: days(-random.int(5, 85)), via: 'swish' });
    }
    if (kind === 'expired') await yearly(member, ['memberBase', 'memberBase', 'memberLab'], random.int(400, 1000), random.int(0, 1));
    if (kind === 'family') {
      await yearly(member, ['familyBase', 'familyLab'], recent, years);
      for (let n = random.int(1, 3); n > 0 && bulkCount < BULK_MEMBERS; n -= 1) {
        const relative = people.person({ minAge: n === 1 ? 20 : 8, maxAge: n === 1 ? 70 : 19 });
        const dependent = await makeMember({
          mid: nextMid(),
          name: `${relative.name.split(' ')[0]} ${person.name.split(' ')[1]}`,
          email: relative.email,
          mobile: relative.mobile,
          birthyear: relative.birthyear,
          ...liabilityFor('current'),
        });
        bulk.push(await joinFamily(dependent, member));
        bulkCount += 1;
      }
    }
    bulk.push(await Members.findOneAsync(member._id));
  }
  // A few bulk members can log in too, as the app would have it.
  for (const member of random.shuffle(bulk).slice(0, 20)) {
    await makeUser({ email: member.email, password: PASSWORD });
  }
  log(`${bulk.length} other members`);

  const allMembers = await Members.find().fetchAsync();
  const isActive = (m) => m.member && m.member > now && !m.excluded;
  const hasLab = (m) => m.lab && m.lab > now && !m.excluded;
  const active = allMembers.filter(isActive);
  const labMembers = allMembers.filter(hasLab);

  // --- Messages: a welcome and a confirmation for members who paid -----------
  for (const member of allMembers.filter((m) => m.member)) {
    const sent = days(-random.int(1, 900));
    await Messages.insertAsync({
      template: welcomeTemplate, member: member._id, type: 'welcome', to: member.email,
      subject: 'Välkommen till Uppsala Makerspace', senddate: sent,
      messagetext: `Hej ${member.name}!\n\nVälkommen som medlem. Ditt medlemsnummer är ${member.mid}.`,
    });
    if (random.chance(0.6)) {
      await Messages.insertAsync({
        template: confirmationTemplate, member: member._id, type: 'confirmation', to: member.email,
        subject: 'Tack för din betalning', senddate: new Date(sent.getTime() + DAY_MS),
        messagetext: `Hej ${member.name}!\n\nVi har tagit emot din betalning.`,
      });
    }
  }
  for (const member of allMembers.filter((m) => m.member && m.member < now).slice(0, 25)) {
    await Messages.insertAsync({
      template: reminderTemplate, member: member._id, type: 'reminder', to: member.email,
      subject: 'Dags att förnya ditt medlemskap', senddate: new Date(member.member.getTime() - 14 * DAY_MS),
      messagetext: `Hej ${member.name}!\n\nDitt medlemskap går ut snart. Förnya i appen.`,
    });
  }

  // --- Spaces, workshops and groups ---------------------------------------
  const space = (spaceId, floor, sv, en) => Spaces.insertAsync({ spaceId, floor, name: { sv, en }, createdAt: days(-700) });
  const spaces = {
    wood: await space('woodworkshop', 'floor1', 'Träverkstaden', 'Wood workshop'),
    metal: await space('metalworkshop', 'floor1', 'Metallverkstaden', 'Metal workshop'),
    print: await space('3dworkshop', 'floor1', '3D-verkstaden', '3D workshop'),
    big: await space('bigroom', 'floor1', 'Stora rummet', 'Big room'),
    electronics: await space('electronics_workshop', 'floor2', 'Elektronikverkstaden', 'Electronics workshop'),
    ceramics: await space('ceramics_workshop', 'floor2', 'Keramikverkstaden', 'Ceramics workshop'),
    textiles: await space('textiles_workshop', 'floor2', 'Textilverkstaden', 'Textile workshop'),
  };

  const pickMembers = (pool, count, exclude = []) =>
    random.shuffle(pool.filter((m) => !exclude.includes(m._id))).slice(0, count);

  const groupWithMembers = async (fields, { members, pending = [] }) => {
    const groupId = await Groups.insertAsync({ createdAt: days(-600), ...fields });
    for (const member of members) {
      await GroupMemberships.insertAsync({
        groupId, memberId: member._id, state: 'active',
        requestedAt: days(-random.int(30, 600)), approvedAt: days(-random.int(1, 29)), approvedBy: '__system__',
      });
    }
    for (const member of pending) {
      await GroupMemberships.insertAsync({ groupId, memberId: member._id, state: 'pending', requestedAt: days(-random.int(1, 10)) });
    }
    return groupId;
  };

  const workshopDefinitions = [
    { key: 'wood', sv: 'Träverkstaden', en: 'Wood workshop', tag: 'Trä', status: 'established' },
    { key: 'metal', sv: 'Metallverkstaden', en: 'Metal workshop', tag: 'Metall', status: 'established' },
    { key: 'print', sv: '3D-verkstaden', en: '3D workshop', tag: '3D', status: 'established' },
    { key: 'electronics', sv: 'Elektronikverkstaden', en: 'Electronics workshop', tag: 'Elektronik', status: 'established' },
    { key: 'ceramics', sv: 'Keramikverkstaden', en: 'Ceramics workshop', tag: 'Keramik', status: 'trial' },
    { key: 'textiles', sv: 'Textilverkstaden', en: 'Textile workshop', tag: 'Textil', status: 'forming' },
  ];
  const workshops = {};
  const steeringGroups = {};
  for (const definition of workshopDefinitions) {
    const isWood = definition.key === 'wood';
    const responsible = isWood ? personas.groupLeader : pickMembers(labMembers, 1)[0];
    const members = isWood
      ? [personas.groupLeader, personas.steering, ...pickMembers(labMembers, 4, [personas.groupLeader._id, personas.steering._id])]
      : [responsible, ...pickMembers(labMembers, random.int(2, 5), [responsible._id])];
    const groupId = await groupWithMembers({
      name: { sv: `Styrgrupp ${definition.sv}`, en: `${definition.en} steering group` },
      type: 'steering', responsibleMemberId: responsible._id,
      joinPolicy: 'request-responsible', allowJoinRequests: true,
      primarySpaceId: spaces[definition.key],
    }, { members, pending: pickMembers(active, isWood ? 2 : random.int(0, 1), members.map((m) => m._id)) });
    steeringGroups[definition.key] = groupId;
    workshops[definition.key] = await Workshops.insertAsync({
      name: { sv: definition.sv, en: definition.en },
      tag: { sv: definition.tag, en: definition.tag },
      description: {
        sv: `${definition.sv} är öppen för alla labbmedlemmar som gått introduktionen.`,
        en: `The ${definition.en.toLowerCase()} is open to all lab members who have taken the introduction.`,
      },
      kind: 'workshop', status: definition.status, groupId, primarySpaceId: spaces[definition.key],
      createdAt: days(-700),
    });
  }
  const retroGroup = await groupWithMembers({
    name: { sv: 'Retrodatorer', en: 'Retro computers' }, type: 'steering',
    joinPolicy: 'open', allowJoinRequests: true,
  }, { members: pickMembers(active, 6) });
  workshops.retro = await Workshops.insertAsync({
    name: { sv: 'Retrodatorer', en: 'Retro computers' }, kind: 'areaOfInterest', status: 'established',
    groupId: retroGroup, primarySpaceId: spaces.big, createdAt: days(-500),
  });
  await groupWithMembers({
    name: { sv: 'Laseransvariga', en: 'Laser keepers' }, type: 'responsibility',
    parentGroupId: steeringGroups.wood, responsibleMemberId: personas.steering._id,
    joinPolicy: 'request-responsible', allowJoinRequests: true,
  }, { members: [personas.steering, ...pickMembers(labMembers, 2, [personas.steering._id])] });
  const financeGroup = await groupWithMembers({
    name: { sv: 'Ekonomigruppen', en: 'Finance group' }, type: 'function',
    responsibleMemberId: personas.treasurer._id, joinPolicy: 'request-responsible', allowJoinRequests: false,
  }, { members: [personas.treasurer, personas.board] });
  await groupWithMembers({
    name: { sv: 'Lokalgruppen', en: 'Premises group' }, type: 'function',
    joinPolicy: 'request-any', allowJoinRequests: true,
  }, { members: pickMembers(active, 5), pending: pickMembers(active, 1) });
  log(`${Object.keys(workshops).length} workshops and areas of interest`);

  // --- Certificates and attestations --------------------------------------
  const certificate = (fields) => Certificates.insertAsync(fields);
  const intro = await certificate({
    name: { sv: 'Introduktion', en: 'Introduction' },
    description: { sv: 'Grundläggande säkerhet och rutiner i lokalen.', en: 'Basic safety and routines.' },
    mandatory: true, certifierRole: 'board',
  });
  const laser = await certificate({
    name: { sv: 'Laserskärare', en: 'Laser cutter' }, workshopId: workshops.wood,
    description: { sv: 'Får använda laserskäraren på egen hand.', en: 'May use the laser cutter unsupervised.' },
    prerequisites: [intro], certifiers: [personas.steering._id, personas.groupLeader._id], defaultValidityDays: 730,
  });
  const welding = await certificate({
    name: { sv: 'Svetsning', en: 'Welding' }, workshopId: workshops.metal,
    prerequisites: [intro], certifiers: pickMembers(labMembers, 2).map((m) => m._id), defaultValidityDays: 730,
  });
  const kiln = await certificate({
    name: { sv: 'Keramikugn', en: 'Ceramics kiln' }, workshopId: workshops.ceramics,
    prerequisites: [intro], certifiers: pickMembers(labMembers, 1).map((m) => m._id),
  });
  const attest = (certificateId, member, { start, end, certifierId = '__system__', pending = false } = {}) =>
    Attestations.insertAsync({
      certificateId, memberId: member._id, certifierId,
      startDate: start || days(-random.int(20, 700)),
      ...(end ? { endDate: end } : {}),
      ...(pending ? {} : { confirmedAt: start || days(-random.int(20, 700)) }),
    });
  const introduced = labMembers.filter(() => random.chance(0.85));
  for (const member of [...introduced, personas.member, personas.steering, personas.groupLeader]) {
    await attest(intro, member);
  }
  for (const member of [personas.member, personas.steering, ...pickMembers(introduced, 18)]) {
    await attest(laser, member, { certifierId: personas.steering._id, end: days(random.int(-60, 600)) });
  }
  for (const member of pickMembers(introduced, 10)) await attest(welding, member, { end: days(random.int(30, 600)) });
  for (const member of pickMembers(introduced, 6)) await attest(kiln, member);
  await attest(laser, personas.base, { start: days(-1), certifierId: personas.steering._id, pending: true });

  // --- Web shop and purchases ---------------------------------------------
  const storeItem = (fields) => StoreItems.insertAsync({ status: 'available', createdAt: days(-400), ...fields });
  const clay = await storeItem({
    code: 'lera', name: { sv: 'Lera, 10 kg', en: 'Clay, 10 kg' }, price: 150,
    requiresMembership: true, bookkeepingAccount: '3010', workshopIds: [workshops.ceramics], sortOrder: 1,
  });
  const laserTime = await storeItem({
    code: 'laser', name: { sv: 'Lasertid, 1 timme', en: 'Laser time, 1 hour' }, price: 50,
    requiresMembership: true, bookkeepingAccount: '3011', workshopIds: [workshops.wood], sortOrder: 2,
  });
  const donation = await storeItem({
    code: 'gava', name: { sv: 'Gåva', en: 'Donation' }, minPrice: 20, maxPrice: 5000,
    commentRequired: false, bookkeepingAccount: '3990', sortOrder: 3,
  });
  const items = [[clay, 'lera', 150], [laserTime, 'laser', 50], [donation, 'gava', null]];
  for (let n = 0; n < 60; n += 1) {
    const [itemId, code, price] = random.pick(items);
    const buyer = random.pick(active);
    await Payments.insertAsync({
      hash: randomHex(), type: 'swish', amount: price || random.pick([50, 100, 200, 500]),
      date: days(-random.int(1, 500)), name: buyer.name, mobile: buyer.mobile, member: buyer._id,
      externalId: randomHex(32).toUpperCase(), message: `ws:${code} ${buyer.name}`.substring(0, 50),
      storeItem: itemId, itemCode: code,
    });
  }

  // --- Bank rows waiting to be matched --------------------------------------
  const unmatched = [
    { type: 'bankgiro', amount: PRICES.memberBase, message: 'medlemsavgift', name: 'OKÄND BETALARE' },
    { type: 'bankgiro', amount: PRICES.memberLab, message: 'labb ' + random.pick(active).name.split(' ')[1] },
    { type: 'swish', amount: PRICES.memberBase, message: 'Medlemskap', name: people.person().name, mobile: '46701234567' },
    { type: 'swish', amount: 75, message: 'kaffe', name: people.person().name, mobile: '46739876543' },
  ];
  for (const row of unmatched) {
    await Payments.insertAsync({ hash: randomHex(), date: days(-random.int(1, 14)), ...row });
  }

  // --- Expense accounts, budgets and expenses -------------------------------
  const year = now.getFullYear();
  const accounts = {};
  for (const key of ['wood', 'metal', 'print', 'ceramics']) {
    const groupId = steeringGroups[key];
    const approvers = await GroupMemberships.find({ groupId, state: 'active' }).fetchAsync();
    accounts[key] = await ExpenseAccounts.insertAsync({
      name: workshopDefinitions.find((w) => w.key === key).sv,
      explanation: 'Förbrukningsmaterial och mindre inköp till verkstaden.',
      groupIds: [groupId], approverMemberIds: approvers.slice(0, 2).map((g) => g.memberId),
      approverGroupIds: [financeGroup], createdAt: days(-600),
    });
    for (const [budgetYear, amount] of [[year - 1, 8000], [year, 10000]]) {
      await ExpenseBudgets.insertAsync({
        expenseAccountId: accounts[key], year: budgetYear, amount, setAt: new Date(budgetYear, 0, 15),
        setBy: personas.treasurer._id, createdAt: new Date(budgetYear, 0, 15),
      });
    }
  }
  const receiptSvg = (place, amount, date) => Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">`
    + `<rect width="300" height="420" fill="#fffef8" stroke="#ccc"/>`
    + `<text x="150" y="50" font-family="monospace" font-size="20" text-anchor="middle">${place}</text>`
    + `<text x="20" y="120" font-family="monospace" font-size="14">Datum: ${date.toISOString().substring(0, 10)}</text>`
    + `<text x="20" y="160" font-family="monospace" font-size="14">Diverse material</text>`
    + `<text x="20" y="360" font-family="monospace" font-size="18">Summa: ${amount} kr</text>`
    + `<text x="150" y="400" font-family="monospace" font-size="11" text-anchor="middle" fill="#999">DEMO</text></svg>`,
  );
  const places = ['Bauhaus', 'Clas Ohlson', 'Biltema', 'Jula', 'Kjell & Company', 'Panduro'];
  const statuses = ['pending', 'submitted', 'submitted', 'confirmed', 'confirmed', 'reimbursed', 'reimbursed', 'reimbursed', 'rejected'];
  let receiptsStored = 0;
  for (let n = 0; n < 30; n += 1) {
    const key = random.pick(Object.keys(accounts));
    const groupMembers = await GroupMemberships.find({ groupId: steeringGroups[key], state: 'active' }).fetchAsync();
    const status = random.pick(statuses);
    const date = days(-random.int(3, 300));
    const amount = random.int(49, 2400);
    const place = random.pick(places);
    let driveFileId = `demo/receipt-${n}.svg`;
    try {
      driveFileId = await uploadImage({ buffer: receiptSvg(place, amount, date), baseName: `demo-receipt-${n}`, mimeType: 'image/svg+xml', date });
      receiptsStored += 1;
    } catch (error) {
      // No receipt store configured: the expense is still there, without a picture.
    }
    const at = (offset) => new Date(date.getTime() + offset * DAY_MS);
    await Expenses.insertAsync({
      memberId: random.pick(groupMembers).memberId, type: random.chance(0.85) ? 'receipt' : 'invoice',
      driveFileId, mimeType: 'image/svg+xml', status, date, createdAt: date, amount,
      expenseAccountId: accounts[key], place, note: 'Förbrukningsmaterial',
      ...(status !== 'pending' ? { submittedAt: at(1) } : {}),
      ...(['confirmed', 'reimbursed'].includes(status) ? { confirmedAt: at(3), confirmedBy: personas.groupLeader._id } : {}),
      ...(status === 'rejected' ? { rejectedAt: at(3), rejectedBy: personas.board._id, rejectionReason: 'Kvittot går inte att läsa.' } : {}),
      ...(status === 'reimbursed' ? { reimbursedAt: at(10), reimbursedBy: personas.treasurer._id, reimbursedDate: at(10), bookkeepingAccount: '5010' } : {}),
    });
  }
  log(`30 expenses, ${receiptsStored} with a receipt picture`);

  // --- Announcements and mails ---------------------------------------------
  const sendMail = async (subject, template, sentAt) => Mails.insertAsync({
    from: 'kansliet@example.org', recipients: 'members', family: true,
    to: active.map((m) => m.email).filter(Boolean), subject, senddate: sentAt, template, formatted: true,
  });
  for (const [subjectSv, bodySv, offset] of [
    ['Nyhetsbrev våren', '# Nyheter\n\nVi har fått en ny laserskärare och keramikverkstaden har öppnat på prov.', -200],
    ['Nyhetsbrev hösten', '# Nyheter\n\nÅrsmötet hålls i mars. Välkommen på städdag i november!', -30],
  ]) {
    const sentAt = days(offset);
    const mailId = await sendMail(subjectSv, bodySv, sentAt);
    await Announcements.insertAsync({
      type: 'newsletter', subjectSv, bodySv, status: 'sent', createdAt: new Date(sentAt.getTime() - 2 * DAY_MS), sentAt, mailId,
    });
  }
  await Announcements.insertAsync({
    type: 'information', subjectSv: 'Stängt under jul', subjectEn: 'Closed over Christmas',
    bodySv: 'Lokalen är stängd 23 december till 2 januari.', bodyEn: 'The premises are closed 23 December to 2 January.',
    status: 'draft', createdAt: days(-2),
  });
  await sendMail('Påminnelse om städdag', 'Hej!\n\nGlöm inte städdagen på lördag.', days(-12));

  // --- Comments on members -------------------------------------------------
  for (const [member, text] of [
    [personas.pending, 'Betalade via Swish, väntar på att styrelsen godkänner.'],
    [personas.excluded, 'Utesluten efter styrelsebeslut. Se protokoll.'],
    [personas.family, 'Har frågat om att lägga till ett tredje barn i familjen.'],
    ...pickMembers(active, 5).map((m) => [m, 'Har lånat nyckel till förrådet.']),
  ]) {
    await Comments.insertAsync({ about: member._id, text, created: days(-random.int(1, 300)) });
  }

  // --- Door unlocks over the last month -----------------------------------
  const doors = ['outerDoor', 'upperFloor'];
  for (let n = 0; n < 400; n += 1) {
    const member = random.pick(labMembers);
    const timestamp = new Date(now.getTime() - random.next() * 30 * DAY_MS);
    await DoorUnlocks.insertAsync({ timestamp, door: random.pick(doors), memberid: member._id, method: random.chance(0.9) ? 'app' : 'danalock' });
  }

  // --- Storage ---------------------------------------------------------------
  // Last, so that the storage hooks see the members' final dates.
  const walls = await makeStorageWalls([
    { _id: 'demo-wall-1', name: 'Våning 1, vägg 1', floor: 'floor1', column_count: 8, row_count: 6 },
    { _id: 'demo-wall-2', name: 'Våning 1, vägg 2', floor: 'floor1', column_count: 4, row_count: 5 },
    { _id: 'demo-wall-3', name: 'Våning 2, vägg 1', floor: 'floor2', column_count: 4, row_count: 6 },
  ], { now });
  const lastPosition = walls[walls.length - 1].end;
  const positions = random.shuffle(Array.from({ length: lastPosition }, (_, i) => i + 1));
  const unitName = (position) => String(1000 + position);
  const owners = [personas.member, personas.family, personas.storage, ...pickMembers(labMembers, 40,
    [personas.member._id, personas.family._id, personas.storage._id])];
  for (const owner of owners) {
    const position = positions.pop();
    await makeStorageUnit(walls, {
      name: unitName(position), position, status: 'occupied', owner: owner._id,
      assignedAt: days(-random.int(10, 600)), now,
    });
  }
  // One expired owner with a warning, one waiting for clearance.
  const warned = personas.expired;
  const warnedPosition = positions.pop();
  await makeStorageUnit(walls, {
    name: unitName(warnedPosition), position: warnedPosition, status: 'occupied', owner: warned._id,
    assignedAt: days(-500), now,
    fields: { warning: { id: 'demo-warning', warned_at: days(-20), warned_by: '__seed__', deadline_at: days(10) } },
  });
  const clearancePosition = positions.pop();
  await makeStorageUnit(walls, {
    name: unitName(clearancePosition), position: clearancePosition, status: 'awaiting_clearance',
    owner: pickMembers(allMembers.filter((m) => m.member && m.member < now), 1)[0]._id, now,
  });
  for (const position of positions) {
    await makeStorageUnit(walls, { name: unitName(position), position, status: random.chance(0.06) ? 'unavailable' : 'available', now });
  }
  for (const owner of [personas.discounted, ...pickMembers(labMembers, 5, owners.map((o) => o._id))]) {
    await StorageRequests.insertAsync({
      owner: owner._id, request_type: 'allocation', requested_at: days(-random.int(1, 60)),
      preference: { floor: random.pick(['floor1', 'floor2']), height: random.pick(['low', 'high']) },
      request_status: 'waiting', createdAt: days(-30), updatedAt: days(-30),
    });
  }
  log(`${lastPosition} storage units, ${owners.length + 2} in use`);

  return { personas, loginUserIds };
};

/** Lines printed after seeding, so that whoever started the demo knows how to log in. */
export const demoLoginSummary = () => [
  `Admin: username "admin", password from settings (adminpassword)`,
  `All logins below use the password "${PASSWORD}":`,
  ...PERSONAS.map(({ email, roles, description }) =>
    `  ${email.padEnd(34)} ${roles?.length ? `[${roles.join(', ')}] ` : ''}${description}`),
];
