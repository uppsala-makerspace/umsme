import React from "react";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import { useBlocks } from "/imports/hooks/useBlocks";
import { useBlocksRouteNavigation } from "/imports/hooks/useBlocksRouteNavigation";

export default function Tool() {
  useBlocks("toolSearch");
  useBlocksRouteNavigation();

  return (
    <Layout>
      <MainContent>
        <div className="toolSearchRow">
          <div data-entryscape="toolSearchInput" />
          <div data-entryscape="toolSearchFilters" />
        </div>
        <div data-entryscape="filterResults" />
        <div data-entryscape="toolSearchResults" />
      </MainContent>
    </Layout>
  );
}
