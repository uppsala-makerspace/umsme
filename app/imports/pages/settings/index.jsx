import React, { useContext, useState } from "react";
import Layout from "/imports/components/Layout/Layout";
import Settings from "./Settings";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { getDefaultPage, setDefaultPage } from "/imports/lib/userPrefs";

export default () => {
  const { memberInfo } = useContext(MemberInfoContext);
  const hasMember = !!memberInfo?.member?.name;
  const [defaultPage, setDefaultPageState] = useState(() => getDefaultPage());

  const handleChangeDefaultPage = (value) => {
    setDefaultPageState(value);
    setDefaultPage(value);
  };

  return (
    <Layout bottomNav={hasMember} showNotifications={hasMember}>
      <Settings
        defaultPage={defaultPage}
        onChangeDefaultPage={handleChangeDefaultPage}
      />
    </Layout>
  );
};
