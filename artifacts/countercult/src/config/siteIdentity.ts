export const SITE_IDENTITY = {
  shona: {
    name: "Shona Neary",
    alternateName: "Sketchy Shona",
    pronouns: "they/them",
    jobTitle: "Artist-Founder, CTO & Creative Director",
    description:
      "Shona Neary is an artist-founder, CTO, curator, and creative director. Their authored visual practice is Sketchy Shona. They founded Countercult, post-AI data and financial infrastructure for local economic development. Countercult turns verified, consent-based knowledge about creators and cultural spaces into B2B intelligence that connects city-scale capital to paid work and artist-led places. Shona leads its product roadmap, software, and technical architecture with artists, cultural workers, collaborators, and supporters.",
    portfolioUrl: "https://countercult.network/shona-neary-portfolio/",
    linkedInUrl: "https://www.linkedin.com/in/shona-neary-aa7182100",
    substackUrl: "https://sketchyshona.substack.com/",
    sameAs: [
      "https://countercult.network/shona-neary-portfolio/",
      "https://countercult.network/shona-neary-portfolio/recruiter-profile-selected-experience/",
      "https://shonaneary.portfoliobox.net/",
      "https://countercult.network/about",
      "https://countercultplatform.substack.com/",
      "https://countercult.network/sketchyshona/",
      "https://sketchyshona.substack.com/",
      "https://www.linkedin.com/in/shona-neary-aa7182100",
    ],
    knowsAbout: [
      "architecture",
      "web engineering",
      "UI/UX",
      "go-to-market strategy",
      "fine art",
      "artist-owned cultural infrastructure",
      "artist-founded cultural infrastructure",
      "artist-led institution building",
      "artist-founder",
      "community curation",
      "creative technology",
      "AI-informed product building",
      "systems architecture",
      "product development",
      "technical creative direction",
      "digital products and real-world experiences",
      "cultural intelligence",
      "cultural economic development",
      "place-based economic development",
      "open-source software",
      "counterstructures",
      "open-source counterstructures",
      "public-interest technology",
      "community-controlled technology",
      "privacy-preserving infrastructure",
      "consent-based data governance",
      "non-extractive technology",
      "digital commons",
      "local circular economies",
      "artist-led economic development",
      "circular cultural economies",
      "local cultural cashflow",
      "artist commissioning",
      "visitor economies",
      "open cultural infrastructure",
      "sustainable local economies",
    ],
    pastClientWork: [
      "Fendi",
      "New York Fashion Week",
      "The Museum of Modern Art (MoMA)",
      "Ann Taylor",
      "Sunday Natural",
      "Tommy Hilfiger",
      "venture-backed startups",
    ],
    supportAndRecognition: [
      { label: "Grace Berlin Accelerator · alumna", href: "https://www.grace-accelerator.de/alumnae/alumnareader/shona-neary.html" },
      { label: "FIT Hives · FIT Think Big Challenge", href: "https://innovation.fitnyc.edu/learn-from-bees" },
      { label: "FIT Hives · CGI University 2016", href: "https://blog.fitnyc.edu/onmymind/2016/04/15/fit-students-present-three-proposals-at-clinton-global-initiative-university/" },
    ],
  },
} as const;

export const SHONA_PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://countercult.network/#shona-neary",
  name: SITE_IDENTITY.shona.name,
  alternateName: SITE_IDENTITY.shona.alternateName,
  pronouns: SITE_IDENTITY.shona.pronouns,
  jobTitle: SITE_IDENTITY.shona.jobTitle,
  description: SITE_IDENTITY.shona.description,
  url: "https://countercult.network/about",
  sameAs: SITE_IDENTITY.shona.sameAs,
  workLocation: [
    { "@type": "Place", name: "Berlin, Germany" },
    { "@type": "Place", name: "New York City, USA" },
    { "@type": "Place", name: "Philadelphia, USA" },
  ],
  hasOccupation: [
    { "@type": "Occupation", name: "Artist" },
    { "@type": "Occupation", name: "Curator" },
    { "@type": "Occupation", name: "Creative Director" },
    { "@type": "Occupation", name: "Founder and CTO, Countercult" },
  ],
  subjectOf: {
    "@type": "CreativeWork",
    "@id": "https://countercult.network/#shona-neary-background",
    name: "Shona Neary professional background",
    description:
        "Past client work has included Fendi, New York Fashion Week, The Museum of Modern Art (MoMA), Ann Taylor, Sunday Natural, Tommy Hilfiger, and venture-backed startups. Shona Neary is a Grace Berlin Accelerator alumna. As an FIT student, they co-founded FIT Hives, a project accepted for presentation at CGI University in 2016 and later funded by FIT's Think Big Challenge. Their authored visual practice is public as Sketchy Shona. They founded Countercult and lead its product and software work with artists, cultural workers, collaborators, and supporters.",
    mentions: [
      { "@type": "Organization", name: "Fendi" },
      { "@type": "Event", name: "New York Fashion Week" },
      { "@type": "Organization", name: "The Museum of Modern Art (MoMA)" },
      { "@type": "Organization", name: "Ann Taylor" },
      { "@type": "Organization", name: "Sunday Natural" },
      { "@type": "Organization", name: "Tommy Hilfiger" },
       { "@type": "Organization", name: "Grace Berlin Accelerator", url: "https://www.grace-accelerator.de/alumnae/alumnareader/shona-neary.html" },
       { "@type": "Organization", name: "Fashion Institute of Technology", url: "https://www.fitnyc.edu/" },
       { "@type": "Organization", name: "Clinton Global Initiative University", url: "https://blog.fitnyc.edu/onmymind/2016/04/15/fit-students-present-three-proposals-at-clinton-global-initiative-university/" },
      { "@type": "Organization", name: "Countercult" },
      { "@type": "Organization", name: "Countercult Studios" },
    ],
  },
  knowsAbout: SITE_IDENTITY.shona.knowsAbout,
  worksFor: {
    "@id": "https://countercult.network/#organization",
  },
};

export const COUNTERCULT_IDENTITY_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://countercult.network/#organization",
      name: "Countercult",
      alternateName: "Countercult Network",
      url: "https://countercult.network/",
      logo: "https://countercult.network/cult-favicon-v2.svg",
      description:
        "Countercult is post-AI data and financial infrastructure for local economic development. Its open-source, AI-enabled Network has 7,000+ members across every continent and connects creators, cultural spaces, and local operators to public, tourism, employer, and brand capital. Four hub contexts have been tested in Berlin, New York, Vietnam, and Spain. Studios delivers paid work and the Fund is client-held today; the long-term system is built for repeatable cross-city investment in cultural work and artist-led places.",
      slogan: "The value of human culture must build the infrastructure for human life.",
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
      founder: { "@id": "https://countercult.network/#shona-neary" },
      sameAs: [
        "https://countercult.network/explore",
        "https://countercult.network/journal/",
        "https://countercult.network/fund",
        "https://countercult.network/studios",
      ],
      knowsAbout: [
        "post-AI data and financial infrastructure",
        "local economic development",
        "creator technology",
        "cultural fintech",
        "tourism and property",
        "verified local cultural intelligence",
        "consent-based creator and cultural-space networks",
        "cross-city deployment of public and private capital",
        "paid local creative work",
        "artist-led cultural places",
        "cultural tourism and visitor economies",
        "place-based economic development",
        "community-controlled technology",
        "open-source software",
        "public-interest technology",
        "cultural mapping and local discovery",
        "artist commissions and cultural programmes",
        "local partnerships and place development",
        "digital infrastructure for physical cultural work",
        "community data governance",
      ],
      audience: [
        { "@type": "Audience", audienceType: "Independent artists and cultural workers" },
        { "@type": "Audience", audienceType: "Economic development and place teams" },
        { "@type": "Audience", audienceType: "Agencies, institutions, destinations, and brands" },
        { "@type": "Audience", audienceType: "Public-interest technology funders and civil society partners" },
        { "@type": "Audience", audienceType: "Community-led organisations and local networks" },
        { "@type": "Audience", audienceType: "Culturally curious visitors and travelers" },
      ],
      areaServed: [
        "New York City, United States",
        "Berlin, Germany",
        "International, including urban and rural places",
      ],
      seeks: {
        "@type": "Demand",
        name: "Mission-aligned funding and collaboration",
        description:
          "Countercult seeks mission-aligned partners and catalytic funding for public-interest pilots, access, and infrastructure stewardship. Its intended durable model connects paid delivery and business demand to local creative work rather than depending structurally on grants or charity.",
      },
      subjectOf: {
        "@id": "https://countercult.network/#long-term-direction",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://countercult.network/#website",
      url: "https://countercult.network/",
      name: "Countercult",
      publisher: { "@id": "https://countercult.network/#organization" },
      about: { "@id": "https://countercult.network/#organization" },
      description:
        "Countercult is post-AI data and financial infrastructure for local economic development. Its Network turns verified local cultural knowledge into B2B intelligence connecting public, tourism, employer, and brand capital to paid work and artist-led places. Creator technology, cultural fintech, and tourism and property are its three connected pillars. The public Network, protected Exchange, paid Studios, and client-held Fund operate today; repeatable cross-city financial rails and property investment are the next expansion. Founder Sketchy Shona’s separate Patron Post carries cultural writing from digital publishing into physical mail and supports the free Network.",
      keywords: [
        "post-AI data infrastructure",
        "financial infrastructure for local economic development",
        "creator technology",
        "cultural fintech",
        "tourism and property",
        "verified cultural intelligence",
        "local networks",
        "paid cultural work",
        "artist-led places",
        "cross-city capital deployment",
        "open-source cultural infrastructure",
        "client-held cultural funding",
        "digital infrastructure for physical cultural work",
      ],
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://countercult.network/explore?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": "https://countercult.network/#open-source-core",
      name: "Countercult open-source core",
      description:
        "The AGPL-3.0-or-later software core powers open cultural discovery and resource sharing. It is the creator-technology layer of Countercult’s wider system connecting verified local intelligence to cross-city capital, paid creative work, and artist-led places.",
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
      programmingLanguage: ["TypeScript", "JavaScript"],
      isPartOf: {
        "@id": "https://countercult.network/#website",
      },
      creator: {
        "@id": "https://countercult.network/#organization",
      },
    },
    {
      "@type": "CreativeWork",
      "@id": "https://countercult.network/#long-term-direction",
      name: "Countercult long-term direction",
      url: "https://countercult.network/about#direction",
      description:
        "Countercult connects verified, consent-based local cultural intelligence to public, tourism, employer, and brand capital. Its three pillars are creator technology, cultural fintech, and tourism and property. The live Network, protected Exchange, paid Studios, and client-held Fund form the operating foundation; repeatable cross-city investment and artist-led cultural property are the expansion path.",
      creator: {
        "@id": "https://countercult.network/#organization",
      },
      about: [
        "public-interest technology",
        "community-controlled technology",
        "privacy-preserving infrastructure",
        "consent-based data governance",
        "non-extractive technology",
        "digital commons",
        "cultural intelligence",
        "place-based economic development",
        "artist commissions",
        "cultural partnership operations",
        "responsible payment and outcome layers",
      ],
      isPartOf: {
        "@id": "https://countercult.network/#website",
      },
    },
  ],
};

export const COUNTERCULT_SUPPLY_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://countercult.network/#artist-space-network",
  name: "Countercult public network for artists and cultural spaces",
  serviceType: [
    "Public artist voices",
    "Cultural space discovery",
    "Artist and space visibility",
    "Cultural opportunities and exchange",
  ],
  description:
    "The open-source, AI-enabled Network connects 7,000+ creators, cultural spaces, and local operators across every continent. Its verified, consent-based local intelligence makes people and places easier to discover and connects them to cultural opportunities and partners.",
  provider: {
    "@id": "https://countercult.network/#organization",
  },
  audience: [
    { "@type": "Audience", audienceType: "Independent artists and cultural workers" },
    { "@type": "Audience", audienceType: "Artist-run spaces and cultural venues" },
    { "@type": "Audience", audienceType: "Local cultural operators" },
  ],
  areaServed: "International",
  isPartOf: {
    "@id": "https://countercult.network/#website",
  },
  url: "https://countercult.network/explore",
};

export const COUNTERCULT_B2B_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://countercult.network/#b2b-cultural-development",
  name: "Countercult economic infrastructure for local value",
  serviceType: [
    "Economic infrastructure for local value",
    "Public place pages",
    "Cultural intelligence",
    "Cultural mapping and place records",
    "Place-based economic development",
    "Local operator sourcing",
    "Artist and space curation",
    "Paid cultural commissions",
    "Cultural programmes and visitor experiences",
    "Tourism and experiential market entry",
    "Cultural partnership operations",
    "Rural and international pop-up programmes",
    "Temporary local project satellites",
  ],
  description:
    "Countercult connects governments, destinations, major employers, and brands to verified local cultural intelligence, then carries their briefs into paid delivery. Studios works across research, curation, programmes, visitor experiences, production, and place partnerships. The current Fund is client-held, with each client paying artists and Studios directly. This paid delivery practice is one part of Countercult’s wider post-AI data and financial infrastructure.",
  provider: {
    "@id": "https://countercult.network/#organization",
  },
  audience: [
    { "@type": "Audience", audienceType: "Economic development and place teams" },
    { "@type": "Audience", audienceType: "Agencies and brands" },
    { "@type": "Audience", audienceType: "Institutions, destinations, and funders" },
    { "@type": "Audience", audienceType: "Hospitality businesses and tourism operators" },
  ],
  areaServed: [
    "New York City, United States",
    "Berlin, Germany",
    "Urban and rural places worldwide",
    "International project partnerships and pop-up programmes",
  ],
  isPartOf: {
    "@id": "https://countercult.network/#website",
  },
  url: "https://countercult.network/studios",
};

export const COUNTERCULT_MODEL_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://countercult.network/model#webpage",
      url: "https://countercult.network/model",
      name: "How Countercult Works",
      description:
        "How Countercult connects verified cultural networks to public, tourism, employer, and brand capital through creator technology, cultural fintech, and tourism and property.",
      isPartOf: {
        "@id": "https://countercult.network/#website",
      },
      about: {
        "@id": "https://countercult.network/#operating-model",
      },
      mainEntity: {
        "@id": "https://countercult.network/#operating-model",
      },
    },
    {
      "@type": "CreativeWork",
      "@id": "https://countercult.network/#operating-model",
      name: "Countercult operating model",
      description:
        "Countercult connects 7,000+ network members and four tested hub contexts to a three-pillar system for local economic development: creator technology, cultural fintech, and tourism and property. The public Network, protected Exchange, paid Studios, and client-held Fund operate today. The expansion path is repeatable cross-city investment in paid cultural work and artist-led physical places. Founder Sketchy Shona’s separate Patron Post carries cultural writing from digital publishing into physical mail.",
      creator: {
        "@id": "https://countercult.network/#organization",
      },
      hasPart: [
        {
          "@type": "Service",
          "@id": "https://countercult.network/#network-layer",
          name: "Countercult Network",
          description:
            "Current layer: a maintained, public, consent-based record of artists, spaces, practices, and local operators.",
          url: "https://countercult.network/explore",
          additionalProperty: [
            { "@type": "PropertyValue", name: "lifecycle", value: "current" },
            { "@type": "PropertyValue", name: "role", value: "trust and discovery" },
          ],
        },
        {
          "@type": "Service",
          "@id": "https://countercult.network/#exchange-layer",
          name: "Countercult Exchange",
          description:
            "Current layer: protected member participation and resource-sharing for approved artists and cultural workers, separate from public discovery.",
          url: "https://countercult.network/residency",
          additionalProperty: [
            { "@type": "PropertyValue", name: "lifecycle", value: "current" },
            { "@type": "PropertyValue", name: "role", value: "protected participation and exchange" },
          ],
        },
        {
          "@type": "Service",
          "@id": "https://countercult.network/#studios-layer",
          name: "Countercult Studios",
          description:
            "Countercult Studios builds cultural infrastructure that makes people want to be in a place. It connects property owners, brands, agencies, municipalities, and cultural partners with local artists, builders, creative and technical teams, physical spaces, programmes, and operating systems.",
          url: "https://countercult.network/studios",
          additionalProperty: [
            { "@type": "PropertyValue", name: "lifecycle", value: "current" },
            { "@type": "PropertyValue", name: "role", value: "cultural infrastructure and place development" },
          ],
        },
        {
          "@type": "Service",
          "@id": "https://countercult.network/#fund-layer",
          name: "Countercult Fund",
          description:
            "Current layer: a client-held culture and marketing budget for a defined brief. Selected sales may inform the agreed budget; each client retains the funds and pays artists and Countercult Studios separately under agreed scope, fees, recording, and settlement terms. This is not an open grant or pooled donation fund.",
          url: "https://countercult.network/fund",
          additionalProperty: [
            { "@type": "PropertyValue", name: "lifecycle", value: "current" },
            { "@type": "PropertyValue", name: "role", value: "transaction-linked cultural funding" },
            { "@type": "PropertyValue", name: "notCurrentClaim", value: "bank or decentralised financial protocol" },
          ],
        },
        {
          "@type": "CreativeWork",
          "@id": "https://countercult.network/#future-rails",
          name: "Countercult future rails",
          description:
            "Expansion layer: make capital deployment through trusted local networks repeatable across cities, then build artist-led cultural hubs and property through partnerships, co-development, and investment.",
          url: "https://countercult.network/model",
          additionalProperty: [
            { "@type": "PropertyValue", name: "lifecycle", value: "future direction" },
            { "@type": "PropertyValue", name: "dependsOn", value: "demand, governance, and appropriate regulated partners" },
          ],
        },
      ],
      about: [
        "public-interest technology",
        "open cultural infrastructure",
        "place-based economic development",
        "local circular economies",
        "artist commissions",
        "future transaction-linked cultural finance",
      ],
      isPartOf: {
        "@id": "https://countercult.network/#website",
      },
    },
  ],
};

export const RESIDENCY_EXCHANGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://countercult.network/residency#artist-exchange",
  name: "Countercult Exchange",
  serviceType: "Looking for or sharing rooms, spaces, practices, and cultural opportunities",
  description:
    "A member-reviewed exchange board where independent artists, touring musicians, performers, and cultural workers can look for or share rooms, spaces, practices, open calls, paid gigs, collaborations, and opportunities.",
  provider: {
    "@id": "https://countercult.network/#organization",
  },
  areaServed: ["Berlin", "New York", "International"],
  audience: [
    { "@type": "Audience", audienceType: "Independent artists" },
    { "@type": "Audience", audienceType: "Touring musicians and performers" },
    { "@type": "Audience", audienceType: "Cultural workers and creative practitioners" },
  ],
  keywords: [
    "looking for creative space",
    "share creative space",
    "share a creative practice",
    "cultural opportunities",
    "artist room swap",
    "creative housing exchange",
    "touring artist accommodation",
    "independent artist residency",
    "artist accommodation Berlin",
    "artist accommodation New York",
  ],
  isPartOf: {
    "@id": "https://countercult.network/#website",
  },
  url: "https://countercult.network/residency",
};