export type ExchangeExample = {
  kind: string;
  glyph: string;
  city: string;
  audience: string;
  description: string;
};

export const EXCHANGE_EXAMPLES: ExchangeExample[] = [
  {
    kind: "offer housing",
    glyph: "⌂",
    city: "berlin",
    audience: "artist",
    description: "temporary room or artist exchange for someone who wants to spend time in berlin and share a practice, meal, or useful local connection.",
  },
  {
    kind: "offer a workspace",
    glyph: "◆",
    city: "cape town",
    audience: "artists",
    description: "daylight studio and project space available for visiting artists working across image, sound, and performance. ask about access, equipment, and a reciprocal exchange.",
  },
  {
    kind: "open call",
    glyph: "↗",
    city: "paris",
    audience: "artists",
    description: "open call for artists to join a small programme with a paid presentation, shared workspace, and introductions to independent cultural operators.",
  },
  {
    kind: "collaboration",
    glyph: "●",
    city: "london",
    audience: "visual artist or filmmaker",
    description: "independent project looking for a visual artist or filmmaker for a site-specific performance in an industrial space in east london.",
  },
  {
    kind: "paid gig",
    glyph: "£",
    city: "dublin",
    audience: "artist or performer",
    description: "looking for a live act for a community-led night in dublin. fee, access needs, and a simple way to share your work are included in the post.",
  },
  {
    kind: "offer a free space",
    glyph: "★",
    city: "nyc",
    audience: "artists",
    description: "short-term access to a rehearsal or making space for visiting artists. share what you are working on and what kind of exchange would make sense.",
  },
];