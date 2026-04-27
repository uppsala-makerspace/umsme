window.__entryscape_config = (window.__entryscape_config || []).concat([{
  block: 'config',
  page_language: 'sv',
  entrystore: "https://data.uppsalamakerspace.se/store/",
  namespaces: {
    ums: "https://data.uppsalamakerspace.se/terms/"
  },
  clicks: {
    "tool": "esb:/tool/${entry}"
  },
  labelProperties: [
    "schema:name",
    "skos:prefLabel"
  ],
  bundles: [
    "https://data.uppsalamakerspace.se/theme/templates/tools.json"
  ],
  query: {
    'metadata.predicate.literal.fc0d21c7': 3
  },
  collections: [
    {
      type: "facet",
      name: "room",
      label: "Verkstad",
      related: true,
      property: "schema:containedInPlace",
      nodetype: "uri"
    },
    {
      type: "facet",
      name: "category",
      label: "Kategori",
      property: "schema:category",
      nodetype: "uri",
    },
    {
      type: "facet",
      name: "material",
      label: "Användningsområde",
      property: "schema:material",
      nodetype: "uri",
    },
    {
      type: "facet",
      name: "placement",
      label: "Plats",
      property: "schema:location",
      nodetype: "uri",
      limit: 5
    },
  ],
  blocks: [
    // Collapsible "Filtrera" panel that toggles the facet checkboxes.
    {
      block: "toolSearchFilters",
      extends: "expand",
      class: "toolSearchFiltersPanel",
      expandhead: `<label class="esbExpandButton esbCollapsed"><i class="fas fa-chevron-down"></i>Filtrera</label>
<label class="esbExpandButton esbExpanded"><i class="fas fa-chevron-up"></i>Stäng filter</label>`,
      expandbody: '{{facets hl="2"}}',
    },
    // Free-text search input for tool names and descriptions.
    {
      block: "toolSearchInput",
      extends: "simpleSearch",
      label: "Sök verktyg",
      placeholder: 't.ex. skruvmejsel eller laserskärare',
    },
    // Paginated list of matching tools — cards showing image, name, category and location.
    {
      block: "toolSearchResults",
      extends: "searchList",
      rdftype: "schema:Product",
      dependencyproperties: "schema:category",
      limit: 10,
      listplaceholder: "no matches",
      namedclick: "tool",
      rowhead: `
<div class="toolImage">
{{image property="schema:image" fallback="https://data.uppsalamakerspace.se/store/6/resource/98" srcTemplate="https://img.infra.entryscape.com/?options=w_100,c_1&url=\${escapedSrc}"}}
</div>
<div class="toolSearchResultBody">
<h2>{{text}}</h2>
{{#eachprop "schema:category"}}<span class="toolCategoryBadge badge badge-secondary">{{label}}</span>{{/eachprop}}
<span class="toolLocation"><i class="fas fa-map-marker-alt"></i>{{text relation="schema:location"}}</span>
</div>
`,
      rowexpand: `
{{#ifprop "schema:location" min="2"}}<p>{{prop "schema:location" nodetype="literal"}}</p>{{/ifprop}}
{{#ifprop "schema:description"}}<p class="toolSearchResultDescription">{{prop "schema:description"}}</p>{{/ifprop}}
<hr>
<p>{{view rdformsid="schema:Product" onecol=true filterpredicates="schema:name,schema:location,schema:category,schema:description,schema:image"}}</p>`,
      facets: true
    },
    // RDForms-rendered table of tool properties; excludes fields displayed elsewhere in toolDetail.
    {
      block: 'toolDetailFields',
      extends: 'view',
      rdformsid: "schema:Product",
      showlanguage: false,
      filterpredicates: "schema:name,schema:location,schema:description,ums:instructionNote,schema:image"
    },
    // Composite tool detail page: heading, image slider, description, instructions, property table, additional images.
    {
      block: 'toolDetail',
      extends: 'template',
      template: `<h2 class="toolDetailHeader">{{text property="schema:name"}}</h2>
       {{slider property="schema:image" fallback="https://data.uppsalamakerspace.se/store/6/resource/98"}}
   {{#ifprop "schema:description"}}<p class="toolDetailDescription">{{prop "schema:description"}}</p>{{/ifprop}}
   {{#ifprop "ums:instructionNote"}}
       <h3>Instruktioner</h3>
       <p class="toolDetailInstructions">{{prop "ums:instructionNote"}}</p>
   {{/ifprop}}
      <h3>Verktygsdetaljer</h3>
   {{toolDetailFields}}
   {{#ifprop "ums:additionalImage"}}<h3>Ytterligare bilder</h3><div class="toolDetailAdditionalImages">{{slider property="ums:additionalImage"}}</div>{{/ifprop}}`
    },
  ]
}]);
