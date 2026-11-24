export interface SearchPage {
  title: string;
  path: string;
}

// Public destinations mirrored from App.tsx PAGE_METADATA. Keep titles here
// intentionally: search never needs to import the application entry point.
export const PUBLIC_SEARCH_PAGES: SearchPage[] = [
  { path: "/", title: "Countercult | Post-AI Data + Financial Infrastructure" },
  { path: "/explore", title: "Find Offbeat Places + Local Culture" },
  { path: "/browse/artist", title: "Find Independent Artists + Cultural Workers" },
  { path: "/city", title: "Public Place Pages for Local Culture" },
  { path: "/place", title: "Find the Culture That Makes a Place Itself" },
  { path: "/browse/space", title: "Artist-Run Spaces + Cultural Infrastructure" },
  { path: "/browse/artifact", title: "Cultural Places, Practices + Local Knowledge" },
  { path: "/tag", title: "Artists, Spaces + Cultural Work by Tag" },
  { path: "/entries", title: "Find Public Artist, Space + Cultural Operator Voices" },
  { path: "/residency/guadalajara", title: "Countercult Art Residency: Mexico | Guadalajara Open Call" },
  { path: "/residency", title: "Artist Residency Exchange | Sketchy Shona + Countercult" },
  { path: "/art-houses", title: "Countercult Art Houses | Free Artist Residencies" },
  { path: "/media", title: "Countercult Media | Culture + Local Economies" },
  { path: "/news", title: "Countercult News | Independent Culture + Local Economies" },
  { path: "/about", title: "About Countercult | Post-AI Local Infrastructure" },
  { path: "/press", title: "Countercult Press Kit | Facts, Records + Contact" },
  { path: "/partners", title: "Work With Countercult | Cultural + Economic Infrastructure" },
  { path: "/collective-fund", title: "Support Countercult’s Collective Fund | Patron Post" },
  { path: "/model", title: "Countercult Model | Data, Capital + Local Culture" },
  { path: "/studios/for-you", title: "Countercult Studios | Strategy + Delivery" },
  { path: "/studios/places", title: "Place-Based Economic Development Through Culture" },
  { path: "/studios/tourism", title: "Economic Development Through Culture for Places" },
  { path: "/studios/economic-development", title: "Local Economic Development Through Local Culture" },
  { path: "/studios/place-intelligence", title: "Local Cultural Context for Places" },
  { path: "/studios/resident-work", title: "Artist Residency Collaboration in Berlin" },
  { path: "/studios/brief", title: "Start a Countercult Studios Brief" },
  { path: "/studios/services", title: "Countercult Studios | Strategy + Delivery" },
  { path: "/studios/start", title: "Work With Countercult | Cultural + Economic Infrastructure" },
  { path: "/studios", title: "Countercult Studios | Strategy + Delivery" },
  { path: "/fund/playbook", title: "Countercult Fund Playbook | Sales-Linked Local Marketing" },
  { path: "/fund", title: "Countercult Fund | Budgets for Local Culture" },
  { path: "/faq", title: "Countercult FAQ | Artists, Cultural Work + Member Exchange" },
  { path: "/privacy", title: "Privacy + Data Rights | Countercult" },
  { path: "/discover", title: "Discover Artists, Spaces + Local Culture" },
  { path: "/join", title: "Join Countercult | Free Network + Sharing Board" },
  { path: "/events/klunkerkranich-2026", title: "Countercult x Klunkerkranich | Live Drawing, Jazz + DJs" },
  { path: "/events/berlin-salon-night", title: "Berlin Salon Night | Countercult x THE FLOOR x Berlin Pulse" },
  { path: "/the-floor", title: "Berlin Artist Residency at THE FLOOR | Sketchy Shona" },
];
