import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { LoginButton } from "./LoginButton";
import OrDivider from "../../components/OrDivider";

const googleConf = {
  buttonTextKey: "loginGoogle",
  icon: "/images/GoogleLogo.png",
};

const facebookConf = {
  buttonTextKey: "loginFacebook",
  icon: "/images/FacebookLogo.png",
};

/**
 * "Log in with Google / Facebook", shown above the Log in | Create account
 * tabs on both pages: the buttons do the same either way, and most members
 * use Google, so they come first. A divider then introduces the email
 * alternative. Renders nothing when neither provider is configured.
 *
 * `google` / `facebook` are `{ method }` from the page's container, or null.
 */
const SocialLogins = ({ google, facebook }) => {
  const { t } = useTranslation();
  // A failed provider login, reported here on whichever page it happened.
  const [errorKey, setErrorKey] = useState(null);

  if (!google && !facebook) return null;

  return (
    <div className="flex flex-col gap-3 mb-2">
      {google && <LoginButton conf={{ ...googleConf, ...google }} onError={setErrorKey} />}
      {facebook && <LoginButton conf={{ ...facebookConf, ...facebook }} onError={setErrorKey} />}
      {errorKey && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 m-0">
          {t(errorKey)}
        </p>
      )}
      <OrDivider label={t("orWithEmail")} />
    </div>
  );
};

SocialLogins.propTypes = {
  google: PropTypes.shape({ method: PropTypes.func }),
  facebook: PropTypes.shape({ method: PropTypes.func }),
};

export default SocialLogins;
