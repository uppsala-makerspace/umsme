/**
 * Swedish-looking people for seeded data. Email addresses are always on a
 * reserved domain (example.org by default), so that nothing seeded can reach
 * a real person even if a recipient guard is misconfigured.
 */
const FIRST_NAMES = {
  female: [
    'Anna', 'Eva', 'Maria', 'Karin', 'Sara', 'Emma', 'Elin', 'Lena', 'Ida', 'Johanna',
    'Linnea', 'Maja', 'Ebba', 'Klara', 'Frida', 'Malin', 'Sofia', 'Agnes', 'Hanna', 'Astrid',
  ],
  male: [
    'Erik', 'Lars', 'Karl', 'Anders', 'Johan', 'Per', 'Nils', 'Mikael', 'Oskar', 'Lukas',
    'Axel', 'Gustav', 'Viktor', 'Emil', 'Olof', 'Hugo', 'Isak', 'Filip', 'Magnus', 'Sven',
  ],
};

const LAST_NAMES = [
  'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson',
  'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Lindberg',
  'Lindström', 'Lindqvist', 'Berg', 'Holm', 'Sandberg', 'Ek', 'Lund', 'Nyström', 'Åberg', 'Öberg',
];

const ASCII = { å: 'a', ä: 'a', ö: 'o', é: 'e' };
const slug = (text) => text.toLowerCase().replace(/[åäöé]/g, (c) => ASCII[c]).replace(/[^a-z]/g, '');

/**
 * A source of distinct people. Two people may share a name, never an email.
 *
 * @param {ReturnType<import('./random').createRandom>} random
 * @param {{ domain?: string, now?: Date }} options
 */
export const createPeople = (random, { domain = 'example.org', now = new Date() } = {}) => {
  const usedEmails = new Set();

  const uniqueEmail = (local) => {
    let candidate = `${local}@${domain}`;
    for (let n = 2; usedEmails.has(candidate); n += 1) candidate = `${local}${n}@${domain}`;
    usedEmails.add(candidate);
    return candidate;
  };

  /**
   * @param {{ gender?: 'female'|'male', minAge?: number, maxAge?: number }} options
   */
  const person = ({ gender = random.pick(['female', 'male']), minAge = 18, maxAge = 75 } = {}) => {
    const first = random.pick(FIRST_NAMES[gender]);
    const last = random.pick(LAST_NAMES);
    return {
      name: `${first} ${last}`,
      email: uniqueEmail(`${slug(first)}.${slug(last)}`),
      mobile: `07${random.pick(['0', '2', '3', '6'])}${String(random.int(0, 9999999)).padStart(7, '0')}`,
      birthyear: now.getFullYear() - random.int(minAge, maxAge),
      gender,
    };
  };

  /** Reserve an address chosen by hand (an e2e persona), so person() never reuses it. */
  const reserve = (email) => {
    usedEmails.add(email.toLowerCase());
    return email.toLowerCase();
  };

  return { person, reserve };
};
