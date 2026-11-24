import { useEffect } from "react";
import { useLocation } from "wouter";

type Topic = {
  eyebrow: string;
  title: string;
  metaTitle?: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
  bullets?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  links: Array<{ href: string; label: string }>;
};

const topics: Record<string, Topic> = {
  "/berlin-culture": {
    eyebrow: "Berlin · agencies · artists · production",
    title: "Berlin cultural infrastructure for local economic development",
    metaTitle: "Countercult | Berlin Cultural Infrastructure",
    description: "Countercult is post-AI data and financial infrastructure for local economic development. It connects verified local creator and space networks to reusable B2B infrastructure in Berlin.",
    sections: [
      { heading: "A city made by relationships", body: "Berlin culture is a working network of artists, musicians, DJs, venues, studios, curators, producers, local operators, and people building independent spaces. Countercult works with that network to make local cultural work easier to find and turn relevant context into paid production. This guide is published by Countercult, not an independent ranking or directory of competing agencies." },
      { heading: "For agencies and direct teams", body: "Countercult Studios works before, alongside, or behind creative, brand, and experiential agencies when a live brief needs Berlin-specific research, independent-scene knowledge, trusted relationships, artist and space curation, creative direction, production, or PR. We can lead a scoped cultural project or take responsibility for a defined part of a wider campaign or experience." },
      { heading: "Proof, context, and a growing publication", body: "Published work includes cultural production for Klunkerkranich, a Pride programme with Zalando, a Most Wanted: Music gathering, and THE FLOOR. The Berlin Senate cites more than 160,000 employees across the city's cultural and creative economy. That is a sector-wide measure, not an agency count or a list of available collaborators. Countercult is building a media publication through stories, features, curation, field guides, and case studies. Shona Neary founded Countercult; their professional work spans creative culture, technology, business, and international markets." },
    ],
    links: [
      { href: "/studios", label: "Work with Countercult Studios" },
      { href: "/studios/brief?route=business#brief", label: "Bring a Berlin agency or cultural production brief" },
      { href: "/eu-us-cultural-production", label: "Plan an EU-US cultural production brief" },
      { href: "/explore?action=join&intent=network", label: "Apply for a free curated Network profile" },
      { href: "/cultural-strategy", label: "Cultural strategy and creative production" },
      { href: "/how-to-find-local-artists-berlin", label: "How to find and commission local artists in Berlin" },
      { href: "/explore", label: "Explore the public culture network" },
      { href: "/journal/berlin-corner-shops/", label: "Read the Berlin corner shops field note" },
      { href: "https://www.berlin.de/sen/kultur/en/cultural-policy", label: "Berlin Senate cultural policy and sector data" },
      { href: "/shona-neary-portfolio/berlin-creative-director-culture-technology/", label: "Shona Neary's Berlin creative direction and product work" },
    ],
  },
  "/new-york-culture": {
    eyebrow: "New York · artists · cultural networks",
    title: "New York cultural infrastructure for local economic development",
    metaTitle: "Countercult | New York Cultural Infrastructure",
    description: "Countercult is post-AI data and financial infrastructure for local economic development. It connects verified local creator and space networks to reusable B2B infrastructure in New York.",
    sections: [
      { heading: "More than a visitor itinerary", body: "New York culture moves through artists, neighbourhoods, independent rooms, fashion, music, design, technology, food, nightlife, and the relationships that connect them. This is Countercult's own field guide, not an independent agency ranking or a directory of competing suppliers." },
      { heading: "For New York agencies and organisations", body: "Countercult Studios can contribute cultural research, creative direction, artist and space curation, production, and a wider view of how a New York brief connects to other places and markets. We work before, alongside, or behind an agency. The public Network supports discovery; it is not an unrestricted talent roster, and every collaboration depends on a specific brief and the consent of the people involved." },
      { heading: "New York's creative economy and Countercult's record", body: "The NYC Comptroller counted 274,461 jobs at creative-sector establishments across 15,958 establishments in 2022. This is a citywide sector measure, not an agency headcount or a count of available collaborators. Countercult is building a media publication through stories, features, curation, field guides, and case studies that connect cultural context to paid delivery. Shona Neary works between New York and Berlin; their professional profile shows the wider creative direction and product practice behind Countercult." },
    ],
    links: [
      { href: "/studios", label: "Work with Countercult Studios" },
      { href: "/studios/brief?route=business#brief", label: "Bring a New York agency or cultural production brief" },
      { href: "/explore?action=join&intent=network", label: "Apply for a free curated Network profile" },
      { href: "/journal/nyc-artists-creative-spaces-network/", label: "Read about New York artists and creative spaces" },
      { href: "/journal/creative-spaces-new-york/", label: "Explore creative spaces in New York" },
      { href: "/journal/creative-tech-collaboration-cultural-intelligence/", label: "Read the Berlin and New York creative-tech exchange record" },
      { href: "/eu-us-cultural-production", label: "Plan an EU-US cultural production brief" },
      { href: "/journal/underground-culture-map-new-york/", label: "Read the New York field note" },
      { href: "https://comptroller.nyc.gov/services/for-the-public/creative-economy-dashboard", label: "NYC Comptroller creative economy data" },
      { href: "/shona-neary-portfolio/new-york-creative-director-venture-technology/", label: "Shona Neary's New York creative direction and product work" },
    ],
  },
  "/philadelphia-culture": {
    eyebrow: "Philadelphia · culture-led briefs · production",
    title: "Philadelphia cultural infrastructure for local economic development",
    metaTitle: "Countercult | Philadelphia Cultural Infrastructure",
    description: "Countercult is post-AI data and financial infrastructure for local economic development, connecting verified creator and space networks to B2B capital deployment across cities.",
    sections: [
      { heading: "A priority market, not a client roster", body: "Philadelphia is a priority market for Countercult Studios. This page describes a route for future briefs, not a claim of a Philadelphia office, current client list, or completed local case studies." },
      { heading: "For agencies and direct teams", body: "Countercult Studios can lead a defined culture-led project or work alongside an existing agency or client team. The work can include research, creative direction, artist and space curation, campaigns, programmes, experiences, production, and fabrication." },
      { heading: "Local context with room to connect", body: "For briefs that connect Philadelphia with New York City, Berlin, or wider EU-US activity, Countercult can carry local context through strategy, partners, production, and delivery. Scope, collaborators, rights, and budget are agreed for each project." },
    ],
    links: [
      { href: "/studios", label: "Work with Countercult Studios" },
      { href: "/studios/brief?route=business#brief", label: "Bring a Philadelphia cultural production brief" },
      { href: "/new-york-culture", label: "New York City cultural production" },
      { href: "/berlin-culture", label: "Berlin cultural production" },
      { href: "/eu-us-cultural-production", label: "Plan an EU-US cultural production brief" },
      { href: "/journal/agency-cultural-partner-independent-culture/", label: "Why agencies bring Countercult into the brief" },
    ],
  },
  "/eu-us-cultural-production": {
    eyebrow: "EU-US · creative production · post-AI",
    title: "EU-US cultural infrastructure for local economic development",
    metaTitle: "Countercult | EU-US Cultural Infrastructure",
    description: "Countercult is post-AI data and financial infrastructure that connects verified local creator and space networks to reusable B2B infrastructure for capital deployment across cities.",
    sections: [
      { heading: "Work across distinct cultural contexts", body: "Countercult's priority contexts include Berlin, New York City, and Philadelphia. EU-US work is not treated as one market: each brief starts with its local partners, audience, rights, budget, and delivery needs." },
      { heading: "The creative production agency", body: "Countercult Studios takes culture-led briefs from strategy and curation through production and fabrication. The team can work alongside an agency or directly with a client, with the scope and responsibilities agreed before delivery." },
      { heading: "A post-AI future shaped by people", body: "Countercult is building toward a post-AI future in which technology helps cultural knowledge travel without replacing the artists and communities who make it. The work is to connect that knowledge to paid production while keeping consent, context, and authorship intact." },
    ],
    links: [
      { href: "/studios", label: "Work with Countercult Studios" },
      { href: "/studios/brief?route=business#brief", label: "Bring a cross-border brief" },
      { href: "/berlin-culture", label: "Berlin cultural production" },
      { href: "/new-york-culture", label: "New York City cultural production" },
      { href: "/philadelphia-culture", label: "Philadelphia cultural production" },
      { href: "/journal/when-everything-can-be-generated-culture-still-has-to-be-found/", label: "Read the creative economy after AI" },
      { href: "/journal/ai-assisted-cultural-infrastructure/", label: "Read what AI can and cannot do for cultural infrastructure" },
      { href: "/journal/agency-cultural-partner-independent-culture/", label: "Why agencies bring Countercult into the brief" },
      { href: "/journal/creative-tech-collaboration-cultural-intelligence/", label: "Read about the Berlin and New York creative-tech exchange" },
    ],
  },
  "/rural-culture": {
    eyebrow: "Rural · culture · place",
    title: "Rural culture is economic infrastructure",
    description: "Countercult works with rural places on living cultural archives, local relationships, artist-led programmes, visitor economies, and responsible cultural development.",
    sections: [
      { heading: "The place is not empty", body: "Rural places already have artists, craftspeople, organisers, memories, businesses, landscapes, social knowledge, and cultural practices that shape how life works there. Countercult begins with those people and relationships rather than imposing an outside destination story." },
      { heading: "Rural Europe in context", body: "The European Commission's Rural Vision says rural areas cover 83% of EU territory and are home to 137 million people, or 30% of the population. Eurostat's separate 2023 measure puts predominantly rural regions at 44.7% of area and 20.6% of population. The classifications differ, and neither measure is a visitor count." },
      { heading: "The Anceu pilot", body: "The Rural Hackers and Anceu case study documents a place-based process in a village described as having 97 residents. It shows local relationships, participation, and cultural work, not proof that one project alone changed the local economy." },
      { heading: "From local knowledge to paid work", body: "Countercult is building a media publication through stories, features, curation, field guides, and case studies. Studios can turn a place brief into research, commissions, programmes, and visitor experiences. Artists and local operators can apply for a free curated Network profile." },
    ],
    links: [
      { href: "/studios/brief?route=place#brief", label: "Bring a rural place or cultural development brief" },
      { href: "/explore?action=join&intent=network", label: "Apply for a free curated Network profile" },
      { href: "/studios/tourism", label: "See destination and tourism work" },
      { href: "/studios/economic-development", label: "See economic development through culture" },
      { href: "/journal/preserving-the-unpreserved/", label: "Read the Anceu case study" },
      { href: "https://rural-vision.europa.eu/rural-vision_en", label: "European Commission Rural Vision" },
      { href: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Urban-rural_Europe_-_demographic_developments_in_rural_regions_and_areas", label: "Eurostat rural-region data" },
    ],
  },
  "/rural-economic-development": {
    eyebrow: "Rural development · strategy · delivery",
    title: "Rural economic development through culture",
    description: "A cultural strategy and delivery partner for rural economic development, local operators, tourism, living archives, and place-based partnerships.",
    sections: [
      { heading: "Beyond promotion", body: "Rural economic development needs a clear understanding of the people, places, practices, businesses, and cultural relationships that already make a region viable. Countercult connects that local knowledge to responsible visitor routes, paid cultural work, and longer-term place partnerships." },
      { heading: "Rural Europe in context", body: "The European Commission's Rural Vision says rural areas cover 83% of EU territory and are home to 137 million people, or 30% of the population. Eurostat's separate 2023 measure says predominantly rural regions represented 44.7% of area and 20.6% of population. These are different rural classifications, not visitor counts. Each place still needs its own baseline for arrivals, seasonality, spending, and local participation." },
      { heading: "A documented place-based example", body: "Countercult's Anceu case study concerns a Galician village described as having 97 residents. The record shows work with Rural Hackers and local partners connecting a mural, local references, and a public cultural record. It documents a process, not a claim that one project alone changed the local economy." },
      { heading: "Build evidence into the work", body: "Map artists, spaces, operators, and practices with consent. Understand travel patterns, seasonality, local capacity, and spending. Shape offers with the people who host and deliver them, separate contributor fees from production budgets, and measure enquiries, paid roles, local procurement, and what continues after a campaign. Countercult's developing media publication gives the work a public record through stories, features, curation, field guides, and case studies." },
    ],
    bullets: ["Cultural tourism and destination strategy", "Place-based economic development", "Local operator and artist curation", "Paid cultural programmes and commissions"],
    links: [
      { href: "/studios/brief?route=place#brief", label: "Bring a rural place or visitor-economy brief" },
      { href: "/explore?action=join&intent=network", label: "Apply for a free curated Network profile" },
      { href: "/studios/economic-development", label: "See Countercult Studios economic development" },
      { href: "/fund", label: "See the Countercult Fund" },
      { href: "/journal/tourism-experiences-and-finance-the-countercult-commercial-model/", label: "Read the commercial model" },
      { href: "/journal/tourism-campaigns-under-traveled-areas/", label: "Read the under-traveled tourism guide" },
      { href: "/journal/under-visited-places-cultural-tourism/", label: "Read about under-visited places" },
      { href: "/journal/preserving-the-unpreserved/", label: "Read the Anceu and Rural Hackers case study" },
      { href: "https://rural-vision.europa.eu/rural-vision_en", label: "European Commission Rural Vision" },
      { href: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Urban-rural_Europe_-_demographic_developments_in_rural_regions_and_areas", label: "Eurostat rural-region data" },
    ],
  },
  "/creator-economy": {
    eyebrow: "Creator economy · infrastructure · paid work",
    title: "The creator economy needs better routes to work",
    description: "Countercult is building creator-economy infrastructure that connects cultural discovery, commissions, programmes, local partnerships, and paid work.",
    sections: [
      { heading: "The missing infrastructure", body: "Independent work needs more than an audience. It needs discovery, trust, context, briefs, commissioning, production, payment, and repeat relationships." },
      { heading: "A wider route", body: "The Network is the public discovery layer. Studios is the paid delivery arm. The Countercult Fund creates demand-side budgets that can turn commercial activity into paid local creative work." },
      { heading: "Beyond the content treadmill", body: "Countercult is designed around consent, attribution, context, direct relationships, and work that can happen offline in real places. It does not treat artists as content factories." },
    ],
    links: [
      { href: "/model", label: "Understand how Countercult works" },
      { href: "/fund/creator-economy", label: "See the Fund creator-economy model" },
      { href: "/journal/the-culture-economy-is-short-on-distribution/", label: "Read why culture needs distribution" },
    ],
  },
  "/web3-culture": {
    eyebrow: "Web3 culture · digital commons · ownership",
    title: "Web3 culture without the spectacle",
    description: "Countercult works on the cultural questions around Web3: artist ownership, digital commons, community governance, consent, attribution, and non-extractive technology.",
    sections: [
      { heading: "The useful questions", body: "Web3 culture raised important questions about ownership, community governance, digital identity, provenance, and how artists can participate in technology without surrendering their work to extractive platforms." },
      { heading: "What Countercult is building", body: "Countercult is not a token project or a crypto consultancy. It works on cultural infrastructure that helps artists, spaces, and communities become discoverable, represented, paid, and governed with more control." },
      { heading: "From commons to paid work", body: "The Network makes existing culture easier to find. Studios connects the right people to paid briefs. The Fund creates budgets for local creative work." },
    ],
    links: [
      { href: "/journal/artist-founded-culture-tech-infrastructure/", label: "Read the artist-founded culture-tech record" },
      { href: "/journal/open-cultural-infrastructure-is-economic-infrastructure/", label: "Read about open cultural infrastructure" },
      { href: "/about", label: "Read about Countercult" },
    ],
  },
  "/culture-tech-startup": {
    eyebrow: "Post-AI infrastructure · cultural finance · tourism + property",
    title: "Post-AI data and financial infrastructure for local economic development",
    metaTitle: "Countercult | Post-AI Data + Financial Infrastructure",
    description: "Countercult turns verified local cultural knowledge into intelligence connecting city capital, paid work, and artist-led places.",
    sections: [
      { heading: "The thesis: data that moves capital", body: "Countercult is post-AI data and financial infrastructure for local economic development. It turns verified, consent-based knowledge about creators and cultural spaces into B2B intelligence for governments, tourism platforms, major employers, and brands investing in cities. The point is not to catalogue culture. It is to move capital into the people and places that create it." },
      { heading: "Creator technology: verified local intelligence", body: "The open-source, AI-enabled Network has 7,000+ members across every continent, bringing creators, cultural spaces, and local operators into one verified discovery layer. Its value is the human verification, local relationships, and cultural context that public scraping alone cannot recreate." },
      { heading: "Cultural fintech: capital into paid work", body: "Countercult’s commercial model connects public and private budgets to paid local creative work. Studios delivers commissions, programmes, visitor experiences, and place partnerships; the current Fund is held by each client, which pays artists and Studios directly." },
      { heading: "Tourism and property: from network to place", body: "Four hub contexts have been tested in Berlin, New York, Vietnam, and Spain. Mexico and Japan are planned next. Pop-ups and local partnerships test how cultural intelligence can strengthen local economies, with a long-term path to artist-led Art Houses and cultural property." },
      { heading: "The operating system and next layer", body: "The public Network, protected member Exchange, paid Studios delivery, and client-held Fund operate today. The next layer is repeatable cross-city infrastructure for deploying capital through trusted local networks; larger financial rails and the first property investment are expansion work." },
      { heading: "Digital intelligence, physical culture", body: "Countercult’s digital Journal and local Network connect to work that happens in real places. Founder Sketchy Shona’s separate Patron Post extends cultural writing into monthly physical mail and supports the free Network. It is one digital-to-print example, not a Countercult product or the whole commercial model." },
    ],
    bullets: [
      "Creator technology: open-source, AI-enabled local intelligence",
      "Cultural fintech: budgets connected to paid creative work",
      "Tourism and property: cultural value carried into physical places",
      "Proof: 7,000+ network members and four tested hub contexts",
    ],
    faqs: [
      { question: "What is Countercult?", answer: "Countercult is post-AI data and financial infrastructure for local economic development. Its open-source Network connects verified artists, cultural spaces, and local operators to public discovery, paid work, and B2B partners." },
      { question: "How does Countercult connect culture to capital?", answer: "Countercult brings local cultural intelligence into briefs from governments, tourism platforms, employers, and brands. Studios delivers the paid work, while the current Fund uses budgets held and paid out directly by each client." },
      { question: "Is Countercult a creative agency?", answer: "Countercult is the infrastructure company. Countercult Studios is its paid cultural strategy and delivery practice, working directly with clients or alongside agencies as one part of the wider system." },
      { question: "What is already operating?", answer: "The public Network, protected member Exchange, paid Studios projects, and client-held Fund are operating. Repeatable financial rails and property investment are the next expansion layer." },
      { question: "How does Countercult connect digital networks to physical places?", answer: "The Network makes local cultural knowledge easier to find and use; Studios and the Fund connect it to paid commissions and place partnerships. The longer-term model carries that value into artist-led hubs and property." },
    ],
    links: [
      { href: "/model", label: "Read the Countercult operating model" },
      { href: "/studios", label: "See the paid Studios routes" },
      { href: "/fund", label: "See the Countercult Fund" },
      { href: "/journal/artist-founded-culture-tech-infrastructure/", label: "Read the artist-founded culture-tech record" },
      { href: "/journal/creative-tech-collaboration-cultural-intelligence/", label: "Read about cultural intelligence in product work" },
      { href: "/journal/open-cultural-infrastructure-is-economic-infrastructure/", label: "Read about open cultural infrastructure" },
      { href: "/journal/preserving-the-unpreserved/", label: "Read the Rural Hackers and Anceu case study" },
    ],
  },
  "/cultural-strategy": {
    eyebrow: "Cultural strategy · curation · production · PR",
    title: "Cultural strategy that reaches the room",
    metaTitle: "Cultural Strategy, Curation, Production + PR | Countercult",
    description: "Countercult provides cultural strategy, artist and space curation, production, PR, creative direction, and place intelligence for serious briefs.",
    sections: [
      { heading: "Strategy is delivery", body: "Cultural strategy is not a moodboard or a list of references. It is the work of understanding a context, finding the right people, making the brief specific, and delivering something that can survive contact with the real world." },
      { heading: "Who brings Countercult into a brief", body: "Agencies, brands, venues, institutions, destinations, hospitality groups, funders, municipalities, and development teams bring Countercult in when they need cultural intelligence and delivery rather than surface-level references. The team can work before, alongside, or behind an agency." },
      { heading: "Work with the people shaping what comes next", body: "Countercult works with independent artists, creative producers, and spaces shaping the next generation of culture. It helps agencies and direct teams bring them into briefs with local context, consent, clear terms, and a real production budget. Countercult does not claim to formally represent a general talent roster; availability and collaboration are agreed with the people involved." },
      { heading: "What delivery can include", body: "Local cultural research and place intelligence, artist, musician, space, and operator curation, programme design, production, creative direction, content, PR, paid commissions, visitor experiences, and economic-development partnerships." },
    ],
    links: [
      { href: "/studios", label: "See Countercult Studios services" },
      { href: "/journal/agency-cultural-partner-independent-culture/", label: "Why agencies bring Countercult into the brief" },
      { href: "/how-to-find-local-artists-berlin", label: "How to find and commission local artists in Berlin" },
      { href: "/journal/klunkerkranich-countercult-paid-cultural-curation/", label: "Read the Klunkerkranich case study" },
      { href: "/shona-neary-portfolio/", label: "Shona Neary, creative direction and product work" },
    ],
  },
  "/fund/creator-economy": {
    eyebrow: "Countercult Fund · creator economy · cultural finance",
    title: "The Fund can become the financial layer for local culture",
    description: "Countercult Fund is a demand-side funding model that turns business activity into budgets for artists, cultural workers, local operators, and creator-led work.",
    sections: [
      { heading: "A commercial budget, not a donation button", body: "A business reserves a small amount from something it sells, keeps that reserve in its own Fund, and uses it to commission local creative work. Countercult connects the budget to standards, people, and delivery." },
      { heading: "Why the opportunity is bigger", body: "The Fund can connect business growth, creator-economy income, cultural production, local economic development, and the budgets needed to make independent culture durable." },
      { heading: "What it can become", body: "The longer-term opportunity includes repeat commissioning, transparent allocation, ledgers, payouts, working capital, cultural procurement, licensed financial partnerships, and measurable local outcomes. Countercult is building toward that infrastructure without claiming to be a bank today." },
    ],
    bullets: ["Demand-side cultural finance", "Repeat commissioning for artists and creators", "Client-held local culture budgets", "A route from agreed budgets to paid creative work"],
    links: [
      { href: "/fund", label: "See how the Countercult Fund works" },
      { href: "/fund/playbook", label: "Set up a Fund playbook" },
      { href: "/journal/what-countercult-finance-could-become/", label: "Read what Countercult Finance could become" },
    ],
  },
};

export default function SeoTopicHub() {
  const [location] = useLocation();
  const topic = topics[location] ?? topics["/culture-tech-startup"];
  const isCultureTechPage = location === "/culture-tech-startup";

  useEffect(() => {
    const title = topic.metaTitle ?? `${topic.title} | Countercult`;
    const setMeta = (attribute: "name" | "property", name: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    document.title = title;
    setMeta("name", "description", topic.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", topic.description);
    setMeta("property", "og:url", `https://countercult.network${location}`);
    setMeta("property", "og:image", "https://countercult.network/images/cult-soap.png");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", topic.description);
  }, [location, topic]);

  return (
    <main className="min-h-[100dvh] bg-black px-4 py-8 font-mono text-white sm:px-8 sm:py-12">
      <div className={`mx-auto ${isCultureTechPage ? "max-w-4xl" : "max-w-5xl"}`}>
        <header className="mb-14 flex items-center justify-between border-b border-white/15 pb-4">
          <a href="/" className="text-sm font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">countercult</a>
          <nav className="flex gap-4 text-[10px] uppercase tracking-widest text-white/55">
            <a href="/explore" className="hover:text-[#c6ff3d]">network</a>
            <a href="/studios" className="hover:text-[#c6ff3d]">studios</a>
            <a href="/fund" className="hover:text-[#c6ff3d]">fund</a>
          </nav>
        </header>

        <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[#c6ff3d]">{topic.eyebrow}</p>
        <h1 className="max-w-4xl text-4xl font-bold uppercase leading-[0.9] tracking-[-0.05em] sm:text-7xl">{topic.title}</h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/70">{topic.description}</p>

        <div className={`mt-14 grid gap-px border border-white/15 bg-white/15 ${isCultureTechPage ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {topic.sections.map((section) => (
            <section key={section.heading} className="bg-black p-5 sm:p-7">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#c6ff3d]">{section.heading}</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/65">{section.body}</p>
            </section>
          ))}
        </div>

        {topic.bullets && (
          <ul className="mt-8 grid gap-2 border-l-2 border-[#c6ff3d] pl-5 text-sm leading-relaxed text-white/70 sm:grid-cols-2">
            {topic.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        )}

        {topic.faqs && (
          <section className="mt-14 border-t border-white/20 pt-8" aria-labelledby="topic-faq-heading">
            <h2 id="topic-faq-heading" className="text-xl font-bold uppercase tracking-[0.08em] text-[#c6ff3d]">Questions about Countercult</h2>
            <div className="mt-6 divide-y divide-white/15 border-y border-white/15">
              {topic.faqs.map(({ question, answer }) => (
                <article key={question} className="py-5">
                  <h3 className="font-bold">{question}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">{answer}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          {topic.links.map((link) => (
            <a key={link.href} href={link.href} className="border-2 border-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}