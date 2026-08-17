import { fn } from "storybook/test";
import StoreItem from "./StoreItem";

export default {
  title: "UMSAPP/StoreItem",
  component: StoreItem,
  parameters: {},
  tags: ["autodocs"],
};

const TERMS = "## 1. Vad du köper\n\nDu köper den vara som anges på köpsidan.";

const base = {
  termsContent: TERMS,
  onBuy: fn(),
};

export const FixedPrice = {
  args: {
    ...base,
    item: {
      _id: "s1", code: "tshirt",
      name: { sv: "T-shirt" },
      description: { sv: "Svart t-shirt med föreningens logga." },
      price: 150, minPrice: null, maxPrice: null,
      requiresMembership: false, commentRequired: false,
      commentPlaceholder: { sv: "Storlek" },
      imageUrl: "https://placehold.co/600x300?text=T-shirt",
      canBuy: true,
    },
  },
};

// No price, so the buyer enters the amount within the item's bounds.
export const BuyerSetsAmount = {
  args: {
    ...base,
    item: {
      _id: "s2", code: "lera",
      name: { sv: "Lera, per kilo" },
      description: { sv: "Väg leran själv och ange beloppet." },
      price: null, minPrice: 20, maxPrice: 500,
      requiresMembership: true, commentRequired: false,
      commentPlaceholder: null, imageUrl: null,
      canBuy: true,
    },
  },
};

export const CommentRequired = {
  args: {
    ...base,
    item: {
      _id: "s3", code: "kurs",
      name: { sv: "Lördagskurs: svarvning" },
      description: { sv: "En heldag vid svarven." },
      price: 300, minPrice: null, maxPrice: null,
      requiresMembership: true, commentRequired: true,
      commentPlaceholder: { sv: "Namn på deltagaren" },
      imageUrl: null, canBuy: true,
    },
  },
};

// A member-only item seen by a non-member: explained, with no form at all.
export const NeedsMembership = {
  args: {
    ...base,
    item: { ...CommentRequired.args.item, canBuy: false },
  },
};

export const SwishDisabled = {
  args: {
    ...base,
    item: FixedPrice.args.item,
    disabledMessage: "Swish-betalningar är tillfälligt avstängda.",
  },
};

export const Loading = { args: { ...base, loading: true } };
