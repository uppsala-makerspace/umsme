import PaymentDetail from "./PaymentDetail";

export default {
  title: "UMSAPP/PaymentDetail",
  component: PaymentDetail,
  parameters: {},
  tags: ["autodocs"],
};

export const Course = {
  args: {
    loading: false,
    payment: {
      _id: "p1", amount: 300, date: new Date("2026-08-08"),
      type: "swish", comment: "Anna Andersson", itemCode: "kurs",
    },
    item: {
      code: "kurs",
      name: { sv: "Lördagskurs: svarvning", en: "Saturday course: turning" },
      imageUrl: "https://placehold.co/600x300?text=Kurs",
    },
    memberName: "Anna Andersson",
  },
};

// No comment and no image — the plainest a purchase gets.
export const Plain = {
  args: {
    loading: false,
    payment: { _id: "p2", amount: 85, date: new Date("2026-08-01"), type: "swish", comment: null, itemCode: "lera" },
    item: { code: "lera", name: { sv: "Lera, per kilo" }, imageUrl: null },
    memberName: "Anna Andersson",
  },
};

// The item was hidden and later deleted: the payment still has to render.
export const ItemGone = {
  args: {
    loading: false,
    payment: { _id: "p3", amount: 150, date: new Date("2025-04-04"), type: "swish", comment: null, itemCode: "gammal" },
    item: null,
    memberName: "Anna Andersson",
  },
};

export const Loading = { args: { loading: true } };
