#!/usr/bin/env node
/**
 * @bhmarketer-ai/street-insider-faq-generator
 * BHMarketer Street Insider FAQ Generator: library and CLI.
 *
 * Type a question in plain English and get the best official answer from 35
 * Street Insider press release FAQs, with a match-confidence score (0 to 100).
 * It can also generate the FAQ as Markdown, JSON, FAQPage JSON-LD or HTML.
 *
 *   si-faq "how much does a street insider press release cost"
 *   si-faq --top 3 "how fast will my crypto release go live"
 *   si-faq --list pricing
 *   si-faq --export jsonld
 *
 * Built by BHMarketer.ai (https://bhmarketer.ai). MIT License.
 */

export const VERSION = "1.0.0";
export const WEBSITE = "https://bhmarketer.ai";
export const SERVICE_PAGE = "https://bhmarketer.ai/street-insider-press-releases/";
export const REPO = "https://github.com/bhmarketer-ai/BHMarketer-street-insider-faq-generator";

export interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface Result {
  id: number;
  category: string;
  question: string;
  answer: string;
  confidence: number;
  band: string;
}

export type ExportFormat = "markdown" | "json" | "jsonld" | "html";

const STOPWORDS = new Set(
  ("a an the is are was were be been do does did can could will would should " +
    "i me my we our you your it its to of in on for with and or at by from as " +
    "how what which who when where why this that there their them they if so " +
    "any get got have has about into up out than then just very need want much").split(" ")
);

const SYNONYMS: Record<string, string> = {
  "cost": "price",
  "costs": "price",
  "pricing": "price",
  "prices": "price",
  "backlink": "link",
  "backlinks": "link",
  "hyperlink": "link",
  "follow": "dofollow",
  "charge": "fee",
  "charges": "fee",
  "fees": "fee",
  "remove": "removal",
  "removed": "removal",
  "removing": "removal",
  "takedown": "removal",
  "delete": "removal",
  "deleted": "removal",
  "chatgpt": "ai",
  "llm": "ai",
  "gemini": "ai",
  "perplexity": "ai",
  "geo": "ai",
  "web3": "crypto",
  "blockchain": "crypto",
  "token": "crypto",
  "tokens": "crypto",
  "pr": "press",
  "release": "press",
  "releases": "press",
  "refunds": "refund",
  "pay": "payment",
  "paying": "payment",
  "long": "time",
  "quick": "fast",
  "quickly": "fast",
  "faster": "fast",
  "article": "article",
  "articles": "article",
  "post": "article",
  "ranking": "rank",
  "rankings": "rank",
  "ranked": "rank",
  "visitors": "traffic",
  "visits": "traffic",
  "mistake": "error",
  "mistakes": "error",
  "typo": "error",
  "typos": "error",
  "contact": "support",
  "whatsapp": "support",
  "cancel": "refund",
  "money": "refund",
  "pictures": "image",
  "photos": "image",
  "photo": "image",
  "images": "image"
};

const WEIGHTS = { question: 2.0, keywords: 1.5, answer: 0.5 };

export const BANDS: [number, number, string, string][] = [
  [0, 30, "No match", "Rephrase the question or contact support"],
  [31, 60, "Possible match", "Answer may be related; check the question shown"],
  [61, 80, "Good match", "Answer is likely what you need"],
  [81, 100, "Strong match", "Answer directly addresses the question"],
];

export const CATEGORIES: Record<string, string> = {
  "general": "What the service is, who BHMarketer.ai is and where to order",
  "seo-ai": "SEO, AI search visibility and authority benefits",
  "pricing": "Prices, packages and refunds",
  "editorial": "Editorial rules and writing standards",
  "timelines": "Turnaround times, Google News and scheduling",
  "post-publication": "Edits, removals and proof of publication",
  "support": "Contact, tracking and extras"
};

export const FAQS: FAQ[] = [
  {
    "id": 1,
    "category": "general",
    "question": "What is the purpose of the BHMarketer Street Insider distribution service?",
    "answer": "It lets businesses, startups and crypto projects work with BHMarketer to buy a press release on Street Insider. Instead of pitching journalists and hoping for coverage, you get a streamlined path to guaranteed editorial publication on a premium financial news site.",
    "keywords": [
      "purpose",
      "service",
      "overview",
      "what",
      "why",
      "buy"
    ]
  },
  {
    "id": 2,
    "category": "general",
    "question": "Who is BHMarketer?",
    "answer": "BHMarketer (BHMarketer.ai) is a global digital PR, media buying and online reputation management (ORM) agency. It specializes in high-authority media placements, cleaning up search results and improving brand visibility across AI discovery engines.",
    "keywords": [
      "who",
      "about",
      "company",
      "agency",
      "bhmarketer"
    ]
  },
  {
    "id": 3,
    "category": "general",
    "question": "What does it mean to buy a press release on Street Insider?",
    "answer": "It means using BHMarketer's verified media placement network to purchase a guaranteed slot for your company milestone, funding news or product announcement on the Street Insider financial news portal.",
    "keywords": [
      "meaning",
      "buy",
      "purchase",
      "slot",
      "placement"
    ]
  },
  {
    "id": 4,
    "category": "general",
    "question": "What is Street Insider?",
    "answer": "Street Insider is an influential American financial news and analysis portal. Institutional funds, venture capitalists, day traders and market analysts follow it closely for fast market intelligence.",
    "keywords": [
      "streetinsider",
      "site",
      "portal",
      "publication",
      "outlet",
      "readers",
      "audience"
    ]
  },
  {
    "id": 5,
    "category": "general",
    "question": "What are the official links to purchase these packages?",
    "answer": "Order through the official BHMarketer channels: the Get on StreetInsider hub (https://getonstreetinsider.com/) for editorial placements, the Street Insider Standard PR package (https://bhmarketer.ai/products/street-insider/) for general company updates, the Street Insider Crypto Press Release package (https://bhmarketer.ai/products/street-insider-crypto-press-release/) for blockchain and Web3 news, and the Street Insider Crypto Presale package (https://bhmarketer.ai/products/street-insider-crypto-presale/) for early-stage token offerings and roadmap rollouts.",
    "keywords": [
      "links",
      "order",
      "buy",
      "where",
      "packages",
      "portal",
      "hub",
      "url"
    ]
  },
  {
    "id": 6,
    "category": "seo-ai",
    "question": "How does a Street Insider press release help my Google ranking (SEO)?",
    "answer": "Street Insider has a Domain Authority of about 76 to 90+ and over 6.4 million indexed backlinks. A placement there sends a strong trust signal to search engines, which can lift your keyword positions and domain rating.",
    "keywords": [
      "seo",
      "google",
      "ranking",
      "domain",
      "authority",
      "da",
      "backlinks",
      "rank"
    ]
  },
  {
    "id": 7,
    "category": "seo-ai",
    "question": "Will BHMarketer help my business appear in AI search engines?",
    "answer": "Yes. AI engines like ChatGPT, Perplexity and Google AI Overviews regularly draw on trusted financial news sites. A Street Insider release bought through BHMarketer becomes an official source those AI systems can cite about your brand.",
    "keywords": [
      "ai",
      "search",
      "chatgpt",
      "perplexity",
      "gemini",
      "overviews",
      "citation",
      "geo"
    ]
  },
  {
    "id": 8,
    "category": "seo-ai",
    "question": "How much web traffic does Street Insider get?",
    "answer": "Street Insider averages about 2.8 million visits per month and ranks prominently in the investing category, so your announcement gets real market visibility.",
    "keywords": [
      "traffic",
      "visitors",
      "visits",
      "monthly",
      "audience",
      "size"
    ]
  },
  {
    "id": 9,
    "category": "seo-ai",
    "question": "Can Street Insider placements help with online reputation management (ORM)?",
    "answer": "Yes. BHMarketer uses high-authority Street Insider articles that rank quickly on search engines. This helps push negative links, complaints or unverified forum threads down to later pages of Google.",
    "keywords": [
      "orm",
      "reputation",
      "negative",
      "results",
      "suppress",
      "push",
      "down"
    ]
  },
  {
    "id": 10,
    "category": "seo-ai",
    "question": "Are the links do-follow or nofollow?",
    "answer": "All placements follow the publisher's standard editorial rules for links. Even so, a natural brand mention on a high-trust site carries strong SEO citation value and sends referral traffic.",
    "keywords": [
      "dofollow",
      "nofollow",
      "link",
      "links",
      "hyperlinks",
      "outbound"
    ]
  },
  {
    "id": 11,
    "category": "pricing",
    "question": "How much does a Street Insider press release cost through BHMarketer?",
    "answer": "Standard investor-focused Street Insider packages start from around $35 to $50, depending on the package you choose. Visit the order page for the current price.",
    "keywords": [
      "price",
      "cost",
      "how",
      "much",
      "pricing",
      "starting",
      "baseline"
    ]
  },
  {
    "id": 12,
    "category": "pricing",
    "question": "Are there any hidden upsells or recurring subscription fees?",
    "answer": "No. Every order with BHMarketer is a transparent, one-time flat fee per article distributed.",
    "keywords": [
      "hidden",
      "fees",
      "upsell",
      "subscription",
      "recurring",
      "charges"
    ]
  },
  {
    "id": 13,
    "category": "pricing",
    "question": "What do I get with the Standard Street Insider package?",
    "answer": "A guaranteed, investor-targeted news placement designed to build instant company credibility in traditional financial markets.",
    "keywords": [
      "standard",
      "package",
      "include",
      "get",
      "business"
    ]
  },
  {
    "id": 14,
    "category": "pricing",
    "question": "What do I get with the Crypto Press Release package?",
    "answer": "A crypto-focused financial distribution built to reach digital asset traders, exchanges and Web3 investors.",
    "keywords": [
      "crypto",
      "package",
      "web3",
      "blockchain",
      "traders",
      "exchanges"
    ]
  },
  {
    "id": 15,
    "category": "pricing",
    "question": "What is included in the Crypto Presale package?",
    "answer": "A professionally formatted article covering your blockchain project architecture, token details, development roadmap and upcoming presale launch information.",
    "keywords": [
      "presale",
      "token",
      "launch",
      "ico",
      "roadmap",
      "package"
    ]
  },
  {
    "id": 16,
    "category": "pricing",
    "question": "What is the refund policy if my press release fails to publish?",
    "answer": "BHMarketer offers a 100% refund guarantee. If your brief is accepted but the release does not go live because of a network issue on the publisher side, you get a full refund.",
    "keywords": [
      "refund",
      "money",
      "back",
      "guarantee",
      "fail"
    ]
  },
  {
    "id": 17,
    "category": "editorial",
    "question": "Are these articles marked as sponsored content or ads?",
    "answer": "Releases publish through Street Insider's standard editorial format with a contributing author byline. Any labels follow the publisher's own rules, which BHMarketer does not control.",
    "keywords": [
      "sponsored",
      "ad",
      "label",
      "byline",
      "marked",
      "advertising"
    ]
  },
  {
    "id": 18,
    "category": "editorial",
    "question": "Can I submit aggressive sales copy or promotional pitches?",
    "answer": "No. The news desk requires a neutral, objective, third-person journalistic tone. BHMarketer's editors polish your draft so it meets financial wire guidelines.",
    "keywords": [
      "sales",
      "copy",
      "promotional",
      "pitch",
      "tone",
      "hype"
    ]
  },
  {
    "id": 19,
    "category": "editorial",
    "question": "Does BHMarketer write the press release for me?",
    "answer": "Yes. Every standard package includes a done-for-you (DFY) writing option, where professional writers create a compliant story angle from your basic brief.",
    "keywords": [
      "write",
      "writing",
      "writer",
      "copywriting",
      "dfy",
      "done"
    ]
  },
  {
    "id": 20,
    "category": "editorial",
    "question": "What content is not allowed?",
    "answer": "Content involving financial scams, unverified health or medical claims, adult material, hate speech or deceptive stock promotion is rejected.",
    "keywords": [
      "banned",
      "rejected",
      "not",
      "allowed",
      "prohibited",
      "content",
      "niches"
    ]
  },
  {
    "id": 21,
    "category": "editorial",
    "question": "Can I review and change the copy before it goes live?",
    "answer": "Yes. You get full preview access to the draft, and every package includes two rounds of free revisions before final sign-off.",
    "keywords": [
      "review",
      "preview",
      "revisions",
      "changes",
      "edit",
      "draft",
      "approve"
    ]
  },
  {
    "id": 22,
    "category": "timelines",
    "question": "How long does the standard Street Insider package take to go live?",
    "answer": "Standard business and financial placements usually go from your approved draft to a live, indexable URL within 3 to 6 days.",
    "keywords": [
      "turnaround",
      "time",
      "delivery",
      "days",
      "how",
      "long",
      "standard"
    ]
  },
  {
    "id": 23,
    "category": "timelines",
    "question": "How fast do the Crypto Press Release and Presale packages go live?",
    "answer": "Because digital asset markets move fast, the Crypto Press Release and Presale packages are fast-tracked to go live within 2 to 3 days.",
    "keywords": [
      "crypto",
      "presale",
      "fast",
      "quick",
      "days",
      "delivery"
    ]
  },
  {
    "id": 24,
    "category": "timelines",
    "question": "Will my article show up on Google News?",
    "answer": "Yes, typically. Street Insider is a verified news source, so published releases are usually picked up and indexed by Google News.",
    "keywords": [
      "google",
      "news",
      "indexed",
      "indexing",
      "tab"
    ]
  },
  {
    "id": 25,
    "category": "timelines",
    "question": "How long does a published article stay on the site?",
    "answer": "Published articles remain in Street Insider's news archive, subject to the publisher's own policies.",
    "keywords": [
      "how",
      "long",
      "stay",
      "online",
      "archive",
      "active",
      "remain"
    ]
  },
  {
    "id": 26,
    "category": "timelines",
    "question": "Can I schedule a specific date and time for my launch?",
    "answer": "Yes. You can choose a future embargo date and time so your release lines up with a product reveal or earnings announcement.",
    "keywords": [
      "schedule",
      "date",
      "time",
      "embargo",
      "future",
      "launch"
    ]
  },
  {
    "id": 27,
    "category": "post-publication",
    "question": "Can I fix a typo or change a link after the release goes live?",
    "answer": "No. Once a release is pushed to the network feeds, it cannot be edited. Check all links, smart contract addresses and phone numbers during the review stage.",
    "keywords": [
      "typo",
      "fix",
      "change",
      "link",
      "edit",
      "after",
      "live"
    ]
  },
  {
    "id": 28,
    "category": "post-publication",
    "question": "What should I do if I spot a serious mistake after launch?",
    "answer": "Contact the support desk immediately. Live text edits are not possible, but the editorial desk can take the main post down to protect your company.",
    "keywords": [
      "mistake",
      "emergency",
      "error",
      "urgent",
      "wrong"
    ]
  },
  {
    "id": 29,
    "category": "post-publication",
    "question": "Can a live article be deleted later if requested?",
    "answer": "Yes. Removal requests can be processed, although it may take a few business days for the deletion to reach every secondary database mirror.",
    "keywords": [
      "delete",
      "removal",
      "remove",
      "take",
      "down",
      "later"
    ]
  },
  {
    "id": 30,
    "category": "post-publication",
    "question": "Do I get proof of my distribution?",
    "answer": "Yes. As soon as syndication finishes, BHMarketer sends a report with the direct live URLs of your published release.",
    "keywords": [
      "proof",
      "report",
      "urls",
      "live",
      "links",
      "confirmation"
    ]
  },
  {
    "id": 31,
    "category": "support",
    "question": "How can I contact the team quickly?",
    "answer": "Message the customer operations team directly on WhatsApp at +1 917 795 8348, or email mojo@wewinconsultants.com.",
    "keywords": [
      "contact",
      "whatsapp",
      "phone",
      "reach",
      "team",
      "talk"
    ]
  },
  {
    "id": 32,
    "category": "support",
    "question": "How do I submit an editorial brief or ask about bulk agency discounts?",
    "answer": "Email your brief, copy questions or bulk agency discount requests to mojo@wewinconsultants.com, or message the team on WhatsApp at +1 917 795 8348.",
    "keywords": [
      "email",
      "brief",
      "submit",
      "submission",
      "bulk",
      "agency",
      "discount"
    ]
  },
  {
    "id": 33,
    "category": "support",
    "question": "Can I track the traffic my links receive?",
    "answer": "The news site does not share page analytics publicly, but you can track results by adding standard UTM tags to the links in your draft.",
    "keywords": [
      "track",
      "traffic",
      "analytics",
      "clicks",
      "utm"
    ]
  },
  {
    "id": 34,
    "category": "support",
    "question": "Can I include logos, images or videos?",
    "answer": "Basic packages are optimized for clean text. Premium tiers let you embed your company logo, product photos or YouTube links to increase reader engagement.",
    "keywords": [
      "logo",
      "images",
      "video",
      "media",
      "youtube",
      "photos"
    ]
  },
  {
    "id": 35,
    "category": "support",
    "question": "Where can I see all the services BHMarketer offers?",
    "answer": "Visit BHMarketer.ai to explore its full range of digital PR, Google review removal and search visibility services.",
    "keywords": [
      "catalog",
      "services",
      "other",
      "more",
      "google",
      "review",
      "removal"
    ]
  }
];

/** Lowercase, split, drop stopwords, singularise and map synonyms. */
export function tokenize(text: string): string[] {
  const t = text
    .toLowerCase()
    .split("bhmarketer.ai").join("bhmarketer")
    .split("getonstreetinsider").join("street insider")
    .split("streetinsider").join("street insider");
  const out: string[] = [];
  for (let w of t.split(/[^a-z0-9]+/)) {
    if (!w || STOPWORDS.has(w)) continue;
    w = SYNONYMS[w] ?? w;
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    w = SYNONYMS[w] ?? w;
    out.push(w);
  }
  return out;
}

function buildIndex(faq: FAQ): Map<string, number> {
  const idx = new Map<string, number>();
  const fields: [string, number][] = [
    [faq.question, WEIGHTS.question],
    [faq.keywords.join(" "), WEIGHTS.keywords],
    [faq.answer, WEIGHTS.answer],
  ];
  for (const [text, weight] of fields) {
    for (const tok of tokenize(text)) idx.set(tok, Math.max(idx.get(tok) ?? 0, weight));
  }
  return idx;
}

const INDEX = FAQS.map((f) => ({ idx: buildIndex(f), qtokens: new Set(tokenize(f.question)), faq: f }));

/** Return [label, meaning] for a confidence score. */
export function band(score: number): [string, string] {
  for (const [low, high, label, meaning] of BANDS) {
    if (score >= low && score <= high) return [label, meaning];
  }
  return ["No match", ""];
}

/** Return up to `top` results, best first. */
export function search(query: string, top = 1): Result[] {
  const q = Array.from(new Set(tokenize(query)));
  if (q.length === 0) return [];
  const scored: { conf: number; cover: number; faq: FAQ }[] = [];
  for (const { idx, qtokens, faq } of INDEX) {
    let points = 0;
    for (const t of q) points += idx.get(t) ?? 0;
    if (points <= 0) continue;
    const conf = Math.min(100, Math.floor((points / (WEIGHTS.question * q.length)) * 100 + 0.5));
    let hit = 0;
    for (const t of qtokens) if (q.includes(t)) hit++;
    const cover = Math.floor((hit * 1000) / Math.max(1, qtokens.size));
    scored.push({ conf, cover, faq });
  }
  scored.sort((a, b) => b.conf - a.conf || b.cover - a.cover || a.faq.id - b.faq.id);
  return scored.slice(0, top).map(({ conf, faq }) => ({
    id: faq.id, category: faq.category, question: faq.question,
    answer: faq.answer, confidence: conf, band: band(conf)[0],
  }));
}

/** Return the single best result, or null when nothing matches. */
export function ask(query: string): Result | null {
  const r = search(query, 1);
  return r.length ? r[0] : null;
}

/** Return one FAQ by number (1 to 35), or null. */
export function getFaq(id: number): FAQ | null {
  return FAQS.find((f) => f.id === id) ?? null;
}

/** Return all FAQs in a category. */
export function byCategory(category: string): FAQ[] {
  return FAQS.filter((f) => f.category === category);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

/** FAQPage JSON-LD for a list of FAQs. */
export function toJsonLd(faqs: FAQ[]): string {
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }, null, 2);
}

/** Generate the FAQ (all or one category) as markdown, json, jsonld or html. */
export function exportFaq(format: ExportFormat = "markdown", category?: string): string {
  const faqs = category ? byCategory(category) : FAQS;
  const title = "Street Insider Press Release FAQ";
  if (format === "json") {
    return JSON.stringify(faqs.map((f) => ({ question: f.question, answer: f.answer })), null, 2) + "\n";
  }
  if (format === "jsonld") return toJsonLd(faqs) + "\n";
  if (format === "html") {
    const items = faqs.map((f) => `  <h3>${esc(f.question)}</h3>\n  <p>${esc(f.answer)}</p>`).join("\n");
    return `<section class="si-faq">\n  <h2>${esc(title)}</h2>\n${items}\n</section>\n` +
      `<script type="application/ld+json">\n${toJsonLd(faqs)}\n</script>\n`;
  }
  const lines = [`# ${title}`, ""];
  for (const f of faqs) lines.push(`## ${f.id}. ${f.question}`, "", f.answer, "");
  lines.push(`*Generated by the BHMarketer Street Insider FAQ Generator. Learn more: ${SERVICE_PAGE}*`);
  return lines.join("\n") + "\n";
}

const USAGE = `BHMarketer Street Insider FAQ Generator v${VERSION}

Usage:
  si-faq "how much does a street insider press release cost"
  si-faq --top 3 "how fast will my crypto release go live"
  si-faq --json "do i get a refund"
  si-faq --list [category]
  si-faq --id 11
  si-faq --categories
  si-faq --export markdown|json|jsonld|html [category]
  si-faq --version`;

export function main(argv: string[] = process.argv.slice(2)): number {
  let args = [...argv];
  const print = (s: string) => console.log(s);
  if (!args.length || args[0] === "-h" || args[0] === "--help") { print(USAGE); return 0; }
  if (args[0] === "--version") { print(VERSION); return 0; }
  if (args[0] === "--categories") {
    for (const [c, d] of Object.entries(CATEGORIES)) {
      print(`${c.padEnd(18)} ${String(byCategory(c).length).padStart(2)}  ${d}`);
    }
    return 0;
  }
  if (args[0] === "--list") {
    const items = args.length > 1 ? byCategory(args[1]) : FAQS;
    if (!items.length) { print("Unknown category. Try --categories"); return 1; }
    for (const f of items) print(`${String(f.id).padStart(2)}. ${f.question}`);
    return 0;
  }
  if (args[0] === "--id") {
    const f = args.length > 1 && /^\d+$/.test(args[1]) ? getFaq(parseInt(args[1], 10)) : null;
    if (!f) { print("FAQ number must be 1 to 35"); return 1; }
    print(`Q${f.id}. ${f.question}\n${f.answer}`);
    return 0;
  }
  if (args[0] === "--export") {
    const fmt = (args[1] ?? "markdown") as ExportFormat;
    const cat = args[2];
    if (!["markdown", "json", "jsonld", "html"].includes(fmt) || (cat && !(cat in CATEGORIES))) {
      print("Use: --export markdown|json|jsonld|html [category]");
      return 1;
    }
    process.stdout.write(exportFaq(fmt, cat));
    return 0;
  }

  let asJson = false;
  let top = 1;
  if (args[0] === "--json") { asJson = true; args = args.slice(1); }
  if (args[0] === "--top") { top = parseInt(args[1], 10); args = args.slice(2); }
  const query = args.join(" ");
  const results = search(query, top);

  if (asJson) {
    print(JSON.stringify({ query, results }, null, 2));
    return results.length ? 0 : 1;
  }
  if (!results.length) {
    print("No matching FAQ found. Try --list to browse all 35 questions,");
    print(`or contact BHMarketer.ai support: ${WEBSITE}/contact/`);
    return 1;
  }
  for (const r of results) {
    print(`Q${r.id}. ${r.question}  [${r.category}]`);
    print(`   ${r.answer}`);
    print(`   Confidence: ${r.confidence}/100 (${r.band})\n`);
  }
  print(`BHMarketer Street Insider FAQ Generator v${VERSION}  |  ${SERVICE_PAGE}`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}
