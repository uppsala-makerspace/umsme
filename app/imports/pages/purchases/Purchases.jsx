import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";

/**
 * Every payment the member has made — webshop purchases and membership payments
 * alike, since both are Payments. Which page a row opens depends on what it is:
 * a membership payment has had its own page all along, a purchase gets the new one.
 *
 * The account page still lists memberships only; that is a different list of a
 * different thing (Memberships, not Payments).
 */
const Purchases = ({ loading, error, payments }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error}</p>
      </MainContent>
    );
  }

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US") : "";

  const rowFor = (p) => {
    const isPurchase = !!p.storeItem;
    const title = isPurchase
      ? localized(p.itemName, lang) || p.itemCode || t("storePurchase")
      : t("MembershipHistory");
    // A membership payment that was never linked to a membership has nowhere to
    // go — admin has not classified it yet — so it stays unlinked rather than
    // leading to a page that would refuse it.
    const to = isPurchase
      ? `/payment/${p._id}`
      : p.membership
        ? `/membership/${p.membership}`
        : null;

    const inner = (
      <>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold leading-snug truncate">{title}</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            {formatDate(p.date)}
            {isPurchase && !p.storeItem ? "" : ""}
          </span>
          {p.comment && (
            <span className="block text-sm text-gray-500 mt-0.5 truncate">{p.comment}</span>
          )}
        </span>
        <span className="font-semibold whitespace-nowrap ml-2">{p.amount} kr</span>
      </>
    );

    const accent = isPurchase ? "border-l-blue-500" : "border-l-[#5fc86f]";
    const shell = `mb-3 rounded-lg bg-white border border-gray-200 border-l-4 ${accent}`;

    return (
      <li key={p._id} className={shell}>
        {to ? (
          <Link
            to={to}
            className="flex items-center gap-3 p-4 no-underline text-inherit transition-colors hover:bg-gray-50"
          >
            {inner}
            <span className="text-gray-400 text-xl">&rarr;</span>
          </Link>
        ) : (
          <div className="flex items-center gap-3 p-4">{inner}</div>
        )}
      </li>
    );
  };

  return (
    <MainContent>
      {payments.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("storeNoPurchases")}</p>
      ) : (
        <ul className="list-none p-0 m-0">{payments.map(rowFor)}</ul>
      )}
    </MainContent>
  );
};

Purchases.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  payments: PropTypes.array,
};

Purchases.defaultProps = {
  loading: false,
  error: null,
  payments: [],
};

export default Purchases;
