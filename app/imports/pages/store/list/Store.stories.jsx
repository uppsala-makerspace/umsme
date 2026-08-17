import Store from "./Store";

export default {
  title: "UMSAPP/Store",
  component: Store,
  parameters: {},
  tags: ["autodocs"],
};

const items = [
  {
    _id: "s1",
    code: "tshirt",
    name: { sv: "T-shirt", en: "T-shirt" },
    price: 150,
    minPrice: null,
    maxPrice: null,
    requiresMembership: false,
    commentRequired: false,
    commentPlaceholder: { sv: "Storlek", en: "Size" },
    imageUrl: "https://placehold.co/600x300?text=T-shirt",
    canBuy: true,
  },
  {
    _id: "s2",
    code: "lera",
    name: { sv: "Lera, per kilo", en: "Clay, per kilo" },
    price: null,
    minPrice: 20,
    maxPrice: 500,
    requiresMembership: true,
    commentRequired: false,
    commentPlaceholder: null,
    imageUrl: null,
    canBuy: true,
  },
  {
    _id: "s3",
    code: "kurs",
    name: { sv: "Lördagskurs: svarvning", en: "Saturday course: turning" },
    price: 300,
    minPrice: null,
    maxPrice: null,
    requiresMembership: true,
    commentRequired: true,
    commentPlaceholder: { sv: "Namn på deltagaren", en: "Name of the participant" },
    imageUrl: null,
    canBuy: false,
  },
  {
    _id: "s4",
    code: "gava",
    name: { sv: "Gåva till föreningen", en: "Donation" },
    price: null,
    minPrice: null,
    maxPrice: null,
    requiresMembership: false,
    commentRequired: false,
    commentPlaceholder: null,
    imageUrl: null,
    canBuy: true,
  },
];

export const AsMember = { args: { loading: false, items } };

// A non-member: the two member-only items are listed but dimmed and unlinked,
// so it is visible that they exist and why they are out of reach.
export const AsNonMember = {
  args: {
    loading: false,
    items: items.map((i) => ({ ...i, canBuy: !i.requiresMembership })),
  },
};

export const Empty = { args: { loading: false, items: [] } };
export const Loading = { args: { loading: true } };
