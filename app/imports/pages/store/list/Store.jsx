import React from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import { localized } from "/imports/common/lib/groupRules";

/**
 * The webshop's front page. Items that require membership are listed for
 * everyone, marked and not linked — a non-member should see that clay exists and
 * why it is out of reach, rather than wonder where it went.
 */
const Store = ({ loading, error, items }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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

  const priceLabel = (item) =>
    item.price === null ? t("storeYouSetTheAmount") : `${item.price} kr`;

  const body = (item) => (
    <>
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={localized(item.name, lang)}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4">
        <span className="flex items-center gap-2 font-semibold leading-snug">
          {localized(item.name, lang)}
          {item.requiresMembership && (
            <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-blue-100 text-blue-800">
              {t("storeMembersOnly")}
            </span>
          )}
        </span>
        <span className="block text-sm text-gray-600 mt-0.5">{priceLabel(item)}</span>
        {!item.canBuy && item.requiresMembership && (
          <span className="block text-sm text-gray-500 mt-1 italic">
            {t("storeNeedsMembership")}
          </span>
        )}
      </div>
    </>
  );

  return (
    <MainContent>
      <div className="mb-6">
        <Button variant="secondary" fullWidth onClick={() => navigate("/purchases")}>
          {t("storeMyPurchases")}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("storeEmpty")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {items.map((item) => (
            <li
              key={item._id}
              className="mb-3 rounded-lg bg-white border border-gray-200 overflow-hidden list-none"
            >
              {item.canBuy ? (
                <Link
                  to={`/store/${encodeURIComponent(item.code)}`}
                  className="block no-underline text-inherit transition-colors hover:bg-gray-50"
                >
                  {body(item)}
                </Link>
              ) : (
                /* Not a link: there is nothing to do on the item's page without
                   a membership, so leading someone there would be a dead end. */
                <div className="opacity-60">{body(item)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </MainContent>
  );
};

Store.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  items: PropTypes.array,
};

Store.defaultProps = {
  loading: false,
  error: null,
  items: [],
};

export default Store;
