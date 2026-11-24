import { Router, type IRouter } from "express";

export const studiosServices = {
  entity: "Countercult Studios",
  category: "Cultural strategy, artist booking, pop-ups, and production",
  description:
    "Countercult Studios is an artist-founded practice offering cultural strategy, local partner curation, artist booking, pop-ups, production, and cultural archiving for places, companies, institutions, and funders.",
  operationalMarkets: ["Berlin", "New York", "International"],
  audiences: [
    "Technology companies and product teams",
    "Cities, rural places, and destinations",
    "Philanthropists, foundations, and cultural funders",
    "Brands, agencies, and institutions",
  ],
  founderBackground: [
    "Shona Neary began her career in business development and design at MoMA.",
    "Shona Neary ran DA SWAMP as an artist and curator.",
    "Past client work has included Fendi, New York Fashion Week, MoMA, Ann Taylor, Sunday Natural, Tommy Hilfiger, and venture-backed startups.",
    "Shona Neary built Countercult's product and software, and Countercult and Countercult Studios bring together her work across art, curation, design, technology, and business development.",
  ],
  approach: [
    "Work with local people rather than treating scenes as a visual reference.",
    "Use public, consented context without selling private member information.",
    "Keep commercial briefs separate from access to the Countercult community.",
  ],
  services: [
    {
      name: "Cultural strategy and local context",
      description:
        "Local context, positioning, concepts, and practical direction for campaigns, places, and cultural projects.",
    },
    {
      name: "Artist booking and programme curation",
      description:
        "Find, brief, and book the right artists, spaces, and cultural partners for a properly funded brief.",
    },
    {
      name: "Pop-ups and production",
      description:
        "Develop and produce temporary cultural formats, local activations, and events when the budget fits.",
    },
    {
      name: "Culture-led campaigns and partnerships",
      description:
        "Build campaigns and partnerships that give people a reason to pay attention, visit, gather, or stay.",
    },
    {
      name: "Cultural archiving and place stories",
      description:
        "Document living culture and help places, institutions, and funders make it easier to find, support, and sustain.",
    },
  ],
  lead: {
    name: "Shona Neary",
    role: "Lead System Architect & Creative Director",
    portfolio: "https://shonaneary.portfoliobox.net/",
    artAndWriting: "https://sketchyshona.substack.com/",
  },
  availability: "Open to conversations about new briefs.",
  inquiryUrl:
    "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3BN2bM5AyDsnDnkXVGC7i7YXLCaDapG7Dgp6Ih7Tt6vJE0z5yP15asCvr5F6im06sCMMDTIoJD",
  website: "https://countercult.network/studios",
} as const;

const router: IRouter = Router();

router.get("/services.json", (_req, res) => {
  res.set({
    "Cache-Control": "public, max-age=3600",
    "X-Engineered-By": "Shona Neary (https://shonaneary.portfoliobox.net/)",
    "X-Art-Direction": "sketchyshona (https://sketchyshona.substack.com/)",
    "X-Platform-Foundation": "Server-Driven Hybrid Architecture",
  });
  res.type("application/json").send(`${JSON.stringify(studiosServices, null, 2)}\n`);
});

export default router;