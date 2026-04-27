window.__entryscape_config = (window.__entryscape_config || []).concat([{
  block: 'config',
  page_language: 'sv',
  entrystore: "https://data.uppsalamakerspace.se/store/",
  namespaces: {
    ums: "https://data.uppsalamakerspace.se/terms/"
  },
  routes: [
    {
      regex: /\/tool\/(.+)$/,
      uri: "https://data.uppsalamakerspace.se/store/1/resource/${1}",
    },
    {
      regex: /\/room\/(.+)$/,
      uri: "https://data.uppsalamakerspace.se/room/${1}",
    },
    {
      regex: /\/placement\/(.+)$/,
      uri: "https://data.uppsalamakerspace.se/placement/${1}",
    },
  ],
  clicks: {
    "placement": "esb:/placement/${1}",
    "tool": "esb:/tool/${entry}",
    "room": "esb:/room/${1}"
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
    {
      block: "umsFacets",
      extends: "facets",
    },
    {
      block: "umsFacets_mobile",
      extends: "expand",
      class: "umsFacets_mobile",
      expandhead: `<label class="esbExpandButton esbCollapsed"><i class="fas fa-chevron-down"></i>Filtrera</label>
<label class="esbExpandButton esbExpanded"><i class="fas fa-chevron-up"></i>Stäng filter</label>`,
      expandbody: '{{facets hl="2"}}',
    },
    {
      block: "umsSearchBox",
      extends: "simpleSearch",
      label: "Sök verktyg",
      placeholder: 't.ex. skruvmejsel eller laserskärare',
    },
    {
      block: 'description_view',
      extends: 'view',
      showLanguage: false,
      rdformsid: "schema:description",
      label: false
    },
    {
      block: 'description',
      extends: 'template',
      template: `
{{#ifprop "schema:description"}}
  <p class="toolViewDescription">{{prop "schema:description"}}</p>
{{/ifprop}}`
    },
    {
      block: "umsSearchResultList",
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
<div class="toolMain">
<h2>{{text}}</h2>
{{#eachprop "schema:category"}}<span class="toolCategory badge badge-secondary">{{label}}</span>{{/eachprop}}
<span class="umslocation"><i class="fas fa-map-marker-alt"></i>{{text relation="schema:location"}}</span>
</div>
`,
      rowexpand: `
{{#ifprop "schema:location" min="2"}}<p>{{prop "schema:location" nodetype="literal"}}</p>{{/ifprop}}
<p class="toolDescription">{{description}}</p>
<hr>
<p>{{view rdformsid="schema:Product" onecol=true filterpredicates="schema:name,schema:location,schema:category,schema:description,schema:image"}}</p>`,
      facets: true
    },
    {
      block: 'toolViewDetails',
      extends: 'view',
      rdformsid: "schema:Product",
      showlanguage: false,
      filterpredicates: "schema:name,schema:location,schema:description,ums:instructionNote,schema:image"
    },
    {
      block: 'toolView',
      extends: 'template',
      template: `<h2 class="umsHeader">{{text property="schema:name"}}</h2>
       {{slider property="schema:image" fallback="https://data.uppsalamakerspace.se/store/6/resource/98"}}
       {{description}}
   {{#ifprop "ums:instructionNote"}}
       <h3>Instruktioner</h3>
       <p class="toolViewInstructions">{{prop "ums:instructionNote"}}</p>
   {{/ifprop}}
      <h3>Verktygsdetaljer</h3>
   {{toolViewDetails}}
   {{#ifprop "ums:additionalImage"}}<h3>Ytterligare bilder</h3><div class="additionalImage">{{slider property="ums:additionalImage"}}</div>{{/ifprop}}`
    },
    {
      block: 'toolView_back',
      extends: 'template',
      template: `<h2 class="umsHeader">{{text property="schema:name"}}</h2>
      <div class="toolPlacement">
          <div>Plats: {{link relation="schema:location" clickmask="https://data.uppsalamakerspace.se/placement/(.*)" namedclick="placement" define="placement"}}</div>
            {{#ifprop "schema:location" min="2"}}<div class="locationDetails">{{prop "schema:location" nodetype="literal"}}</div>{{/ifprop}} 
          <div>Verkstad: {{link use="placement" clickmask="https://data.uppsalamakerspace.se/room/(.*)" namedclick="room" relation="schema:containedInPlace"}}</div>
       </div>
       {{slider property="schema:image"}}
       {{description}}
   {{#ifprop "ums:instructionNote"}}
       <h3>Instruktioner</h3>
       <p class="toolViewInstructions">{{prop "ums:instructionNote"}}</p>
   {{/ifprop}}
      <h3>Verktygsdetaljer</h3>
   {{toolViewDetails}}
   {{#ifprop "ums:additionalImage"}}<h3>Ytterligare bilder</h3><div class="additionalImage">{{slider property="ums:additionalImage"}}</div>{{/ifprop}}`
    },
    {
      block: 'placementTools',
      extends: 'template',
      template: `{{link class="btn btn-primary backToSearchButton" click="/tool" clickkey="placement" clickvalue="resource" content="Filtrera på denna plats i verktygssök"}}`
    },
    {
      block: 'placementView',
      extends: 'template',
      template: `
      {{placementTools}}
      <h2 class="umsHeader">{{text property="schema:name"}}</h2>
      <div class="toolPlacement">
          <div>Verkstad: {{link clickmask="https://data.uppsalamakerspace.se/room/(.*)" namedclick="room" relation="schema:containedInPlace"}}</div>
      </div>
      {{slider property="schema:image"}}
      {{description}}
   {{#ifprop "ums:additionalImage"}}<h3>Ytterligare bilder</h3><div class="additionalImage">{{slider property="ums:additionalImage"}}</div>{{/ifprop}}
  </div>      `
    },
    {
      block: 'roomTools',
      extends: 'template',
      template: `{{link class="btn btn-primary backToSearchButton" click="/tool" clickkey="room" clickvalue="resource" content="Filtrera på denna verkstad i verktygssök"}}`
    },
    {
      block: 'roomPlacements',
      extends: 'list',
      layout: 'raw',
      listhead: '<h3>Platser i verkstaden:</h3>',
      rowhead: '{{link clickmask="https://data.uppsalamakerspace.se/placement/(.*)" namedclick="placement"}}',
      relationinverse: 'schema:containedInPlace',
      sortOrder: 'title.sv+asc',
    },
    {
      block: 'roomView',
      extends: 'template',
      template: `
      {{roomTools}}
      <h2 class="umsHeader">{{text property="schema:name"}}</h2>
      {{slider property="schema:image"}}
      {{description}}
     {{roomPlacements}}
   {{#ifprop "ums:additionalImage"}}<h3>Ytterligare bilder</h3><div class="additionalImage">{{slider property="ums:additionalImage"}}</div>{{/ifprop}}
   </div>
   <div class="toolViewCol2">{{slider property="schema:image"}}
   </div>
  </div>`
    }
  ]
}]);
