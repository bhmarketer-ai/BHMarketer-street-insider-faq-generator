"""
street_insider_faq: BHMarketer Street Insider FAQ Generator.

A small, dependency-free FAQ engine for BHMarketer.ai's Street Insider press
release service. Type a question in plain English and it returns the best
official answer from 35 FAQs with a match-confidence score (0 to 100). It can
also generate the FAQ as Markdown, JSON, FAQPage JSON-LD or HTML.

Usage:
    python street_insider_faq.py "how much does a street insider press release cost"
    python street_insider_faq.py --top 3 "how fast will my crypto release go live"
    python street_insider_faq.py --list pricing
    python street_insider_faq.py --categories
    python street_insider_faq.py --json "do i get a refund"
    python street_insider_faq.py --export markdown [category]

Built by BHMarketer.ai (https://bhmarketer.ai). MIT License.
"""

import html
import json
import re
import sys

__version__ = "1.0.0"

WEBSITE = "https://bhmarketer.ai"
SERVICE_PAGE = "https://bhmarketer.ai/street-insider-press-releases/"
REPO = "https://github.com/bhmarketer-ai/BHMarketer-street-insider-faq-generator"

STOPWORDS = set(
    "a an the is are was were be been do does did can could will would should "
    "i me my we our you your it its to of in on for with and or at by from as "
    "how what which who when where why this that there their them they if so "
    "any get got have has about into up out than then just very need want much".split()
)

SYNONYMS = {
    "cost": "price", "costs": "price", "pricing": "price", "prices": "price",
    "backlink": "link", "backlinks": "link", "hyperlink": "link", "follow": "dofollow",
    "charge": "fee", "charges": "fee", "fees": "fee",
    "remove": "removal", "removed": "removal", "removing": "removal",
    "takedown": "removal", "delete": "removal", "deleted": "removal",
    "chatgpt": "ai", "llm": "ai", "gemini": "ai", "perplexity": "ai", "geo": "ai",
    "web3": "crypto", "blockchain": "crypto", "token": "crypto", "tokens": "crypto",
    "pr": "press", "release": "press", "releases": "press",
    "refunds": "refund", "pay": "payment", "paying": "payment",
    "long": "time", "quick": "fast", "quickly": "fast", "faster": "fast",
    "article": "article", "articles": "article", "post": "article",
    "ranking": "rank", "rankings": "rank", "ranked": "rank",
    "visitors": "traffic", "visits": "traffic",
    "mistake": "error", "mistakes": "error", "typo": "error", "typos": "error",
    "contact": "support", "whatsapp": "support",
    "cancel": "refund", "money": "refund",
    "pictures": "image", "photos": "image", "photo": "image", "images": "image",
}

WEIGHTS = {"question": 2.0, "keywords": 1.5, "answer": 0.5}

BANDS = [
    (0, 30, "No match", "Rephrase the question or contact support"),
    (31, 60, "Possible match", "Answer may be related; check the question shown"),
    (61, 80, "Good match", "Answer is likely what you need"),
    (81, 100, "Strong match", "Answer directly addresses the question"),
]

CATEGORIES = {
    "general": "What the service is, who BHMarketer.ai is and where to order",
    "seo-ai": "SEO, AI search visibility and authority benefits",
    "pricing": "Prices, packages and refunds",
    "editorial": "Editorial rules and writing standards",
    "timelines": "Turnaround times, Google News and scheduling",
    "post-publication": "Edits, removals and proof of publication",
    "support": "Contact, tracking and extras"
}

FAQS = [
    {"id": 1, "category": "general", "question": "What is the purpose of the BHMarketer Street Insider distribution service?", "answer": "It lets businesses, startups and crypto projects work with BHMarketer to buy a press release on Street Insider. Instead of pitching journalists and hoping for coverage, you get a streamlined path to guaranteed editorial publication on a premium financial news site.", "keywords": ["purpose", "service", "overview", "what", "why", "buy"]},
    {"id": 2, "category": "general", "question": "Who is BHMarketer?", "answer": "BHMarketer (BHMarketer.ai) is a global digital PR, media buying and online reputation management (ORM) agency. It specializes in high-authority media placements, cleaning up search results and improving brand visibility across AI discovery engines.", "keywords": ["who", "about", "company", "agency", "bhmarketer"]},
    {"id": 3, "category": "general", "question": "What does it mean to buy a press release on Street Insider?", "answer": "It means using BHMarketer's verified media placement network to purchase a guaranteed slot for your company milestone, funding news or product announcement on the Street Insider financial news portal.", "keywords": ["meaning", "buy", "purchase", "slot", "placement"]},
    {"id": 4, "category": "general", "question": "What is Street Insider?", "answer": "Street Insider is an influential American financial news and analysis portal. Institutional funds, venture capitalists, day traders and market analysts follow it closely for fast market intelligence.", "keywords": ["streetinsider", "site", "portal", "publication", "outlet", "readers", "audience"]},
    {"id": 5, "category": "general", "question": "What are the official links to purchase these packages?", "answer": "Order through the official BHMarketer channels: the Get on StreetInsider hub (https://getonstreetinsider.com/) for editorial placements, the Street Insider Standard PR package (https://bhmarketer.ai/products/street-insider/) for general company updates, the Street Insider Crypto Press Release package (https://bhmarketer.ai/products/street-insider-crypto-press-release/) for blockchain and Web3 news, and the Street Insider Crypto Presale package (https://bhmarketer.ai/products/street-insider-crypto-presale/) for early-stage token offerings and roadmap rollouts.", "keywords": ["links", "order", "buy", "where", "packages", "portal", "hub", "url"]},
    {"id": 6, "category": "seo-ai", "question": "How does a Street Insider press release help my Google ranking (SEO)?", "answer": "Street Insider has a Domain Authority of about 76 to 90+ and over 6.4 million indexed backlinks. A placement there sends a strong trust signal to search engines, which can lift your keyword positions and domain rating.", "keywords": ["seo", "google", "ranking", "domain", "authority", "da", "backlinks", "rank"]},
    {"id": 7, "category": "seo-ai", "question": "Will BHMarketer help my business appear in AI search engines?", "answer": "Yes. AI engines like ChatGPT, Perplexity and Google AI Overviews regularly draw on trusted financial news sites. A Street Insider release bought through BHMarketer becomes an official source those AI systems can cite about your brand.", "keywords": ["ai", "search", "chatgpt", "perplexity", "gemini", "overviews", "citation", "geo"]},
    {"id": 8, "category": "seo-ai", "question": "How much web traffic does Street Insider get?", "answer": "Street Insider averages about 2.8 million visits per month and ranks prominently in the investing category, so your announcement gets real market visibility.", "keywords": ["traffic", "visitors", "visits", "monthly", "audience", "size"]},
    {"id": 9, "category": "seo-ai", "question": "Can Street Insider placements help with online reputation management (ORM)?", "answer": "Yes. BHMarketer uses high-authority Street Insider articles that rank quickly on search engines. This helps push negative links, complaints or unverified forum threads down to later pages of Google.", "keywords": ["orm", "reputation", "negative", "results", "suppress", "push", "down"]},
    {"id": 10, "category": "seo-ai", "question": "Are the links do-follow or nofollow?", "answer": "All placements follow the publisher's standard editorial rules for links. Even so, a natural brand mention on a high-trust site carries strong SEO citation value and sends referral traffic.", "keywords": ["dofollow", "nofollow", "link", "links", "hyperlinks", "outbound"]},
    {"id": 11, "category": "pricing", "question": "How much does a Street Insider press release cost through BHMarketer?", "answer": "Standard investor-focused Street Insider packages start from around $35 to $50, depending on the package you choose. Visit the order page for the current price.", "keywords": ["price", "cost", "how", "much", "pricing", "starting", "baseline"]},
    {"id": 12, "category": "pricing", "question": "Are there any hidden upsells or recurring subscription fees?", "answer": "No. Every order with BHMarketer is a transparent, one-time flat fee per article distributed.", "keywords": ["hidden", "fees", "upsell", "subscription", "recurring", "charges"]},
    {"id": 13, "category": "pricing", "question": "What do I get with the Standard Street Insider package?", "answer": "A guaranteed, investor-targeted news placement designed to build instant company credibility in traditional financial markets.", "keywords": ["standard", "package", "include", "get", "business"]},
    {"id": 14, "category": "pricing", "question": "What do I get with the Crypto Press Release package?", "answer": "A crypto-focused financial distribution built to reach digital asset traders, exchanges and Web3 investors.", "keywords": ["crypto", "package", "web3", "blockchain", "traders", "exchanges"]},
    {"id": 15, "category": "pricing", "question": "What is included in the Crypto Presale package?", "answer": "A professionally formatted article covering your blockchain project architecture, token details, development roadmap and upcoming presale launch information.", "keywords": ["presale", "token", "launch", "ico", "roadmap", "package"]},
    {"id": 16, "category": "pricing", "question": "What is the refund policy if my press release fails to publish?", "answer": "BHMarketer offers a 100% refund guarantee. If your brief is accepted but the release does not go live because of a network issue on the publisher side, you get a full refund.", "keywords": ["refund", "money", "back", "guarantee", "fail"]},
    {"id": 17, "category": "editorial", "question": "Are these articles marked as sponsored content or ads?", "answer": "Releases publish through Street Insider's standard editorial format with a contributing author byline. Any labels follow the publisher's own rules, which BHMarketer does not control.", "keywords": ["sponsored", "ad", "label", "byline", "marked", "advertising"]},
    {"id": 18, "category": "editorial", "question": "Can I submit aggressive sales copy or promotional pitches?", "answer": "No. The news desk requires a neutral, objective, third-person journalistic tone. BHMarketer's editors polish your draft so it meets financial wire guidelines.", "keywords": ["sales", "copy", "promotional", "pitch", "tone", "hype"]},
    {"id": 19, "category": "editorial", "question": "Does BHMarketer write the press release for me?", "answer": "Yes. Every standard package includes a done-for-you (DFY) writing option, where professional writers create a compliant story angle from your basic brief.", "keywords": ["write", "writing", "writer", "copywriting", "dfy", "done"]},
    {"id": 20, "category": "editorial", "question": "What content is not allowed?", "answer": "Content involving financial scams, unverified health or medical claims, adult material, hate speech or deceptive stock promotion is rejected.", "keywords": ["banned", "rejected", "not", "allowed", "prohibited", "content", "niches"]},
    {"id": 21, "category": "editorial", "question": "Can I review and change the copy before it goes live?", "answer": "Yes. You get full preview access to the draft, and every package includes two rounds of free revisions before final sign-off.", "keywords": ["review", "preview", "revisions", "changes", "edit", "draft", "approve"]},
    {"id": 22, "category": "timelines", "question": "How long does the standard Street Insider package take to go live?", "answer": "Standard business and financial placements usually go from your approved draft to a live, indexable URL within 3 to 6 days.", "keywords": ["turnaround", "time", "delivery", "days", "how", "long", "standard"]},
    {"id": 23, "category": "timelines", "question": "How fast do the Crypto Press Release and Presale packages go live?", "answer": "Because digital asset markets move fast, the Crypto Press Release and Presale packages are fast-tracked to go live within 2 to 3 days.", "keywords": ["crypto", "presale", "fast", "quick", "days", "delivery"]},
    {"id": 24, "category": "timelines", "question": "Will my article show up on Google News?", "answer": "Yes, typically. Street Insider is a verified news source, so published releases are usually picked up and indexed by Google News.", "keywords": ["google", "news", "indexed", "indexing", "tab"]},
    {"id": 25, "category": "timelines", "question": "How long does a published article stay on the site?", "answer": "Published articles remain in Street Insider's news archive, subject to the publisher's own policies.", "keywords": ["how", "long", "stay", "online", "archive", "active", "remain"]},
    {"id": 26, "category": "timelines", "question": "Can I schedule a specific date and time for my launch?", "answer": "Yes. You can choose a future embargo date and time so your release lines up with a product reveal or earnings announcement.", "keywords": ["schedule", "date", "time", "embargo", "future", "launch"]},
    {"id": 27, "category": "post-publication", "question": "Can I fix a typo or change a link after the release goes live?", "answer": "No. Once a release is pushed to the network feeds, it cannot be edited. Check all links, smart contract addresses and phone numbers during the review stage.", "keywords": ["typo", "fix", "change", "link", "edit", "after", "live"]},
    {"id": 28, "category": "post-publication", "question": "What should I do if I spot a serious mistake after launch?", "answer": "Contact the support desk immediately. Live text edits are not possible, but the editorial desk can take the main post down to protect your company.", "keywords": ["mistake", "emergency", "error", "urgent", "wrong"]},
    {"id": 29, "category": "post-publication", "question": "Can a live article be deleted later if requested?", "answer": "Yes. Removal requests can be processed, although it may take a few business days for the deletion to reach every secondary database mirror.", "keywords": ["delete", "removal", "remove", "take", "down", "later"]},
    {"id": 30, "category": "post-publication", "question": "Do I get proof of my distribution?", "answer": "Yes. As soon as syndication finishes, BHMarketer sends a report with the direct live URLs of your published release.", "keywords": ["proof", "report", "urls", "live", "links", "confirmation"]},
    {"id": 31, "category": "support", "question": "How can I contact the team quickly?", "answer": "Message the customer operations team directly on WhatsApp at +1 917 795 8348, or email mojo@wewinconsultants.com.", "keywords": ["contact", "whatsapp", "phone", "reach", "team", "talk"]},
    {"id": 32, "category": "support", "question": "How do I submit an editorial brief or ask about bulk agency discounts?", "answer": "Email your brief, copy questions or bulk agency discount requests to mojo@wewinconsultants.com, or message the team on WhatsApp at +1 917 795 8348.", "keywords": ["email", "brief", "submit", "submission", "bulk", "agency", "discount"]},
    {"id": 33, "category": "support", "question": "Can I track the traffic my links receive?", "answer": "The news site does not share page analytics publicly, but you can track results by adding standard UTM tags to the links in your draft.", "keywords": ["track", "traffic", "analytics", "clicks", "utm"]},
    {"id": 34, "category": "support", "question": "Can I include logos, images or videos?", "answer": "Basic packages are optimized for clean text. Premium tiers let you embed your company logo, product photos or YouTube links to increase reader engagement.", "keywords": ["logo", "images", "video", "media", "youtube", "photos"]},
    {"id": 35, "category": "support", "question": "Where can I see all the services BHMarketer offers?", "answer": "Visit BHMarketer.ai to explore its full range of digital PR, Google review removal and search visibility services.", "keywords": ["catalog", "services", "other", "more", "google", "review", "removal"]},
]


def tokenize(text):
    """Lowercase, split, drop stopwords, singularise and map synonyms."""
    text = text.lower().replace("bhmarketer.ai", "bhmarketer")
    text = text.replace("getonstreetinsider", "street insider").replace("streetinsider", "street insider")
    out = []
    for w in re.split(r"[^a-z0-9]+", text):
        if not w or w in STOPWORDS:
            continue
        w = SYNONYMS.get(w, w)
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        w = SYNONYMS.get(w, w)
        out.append(w)
    return out


def _index(faq):
    idx = {}
    for field, weight in WEIGHTS.items():
        text = " ".join(faq[field]) if isinstance(faq[field], list) else faq[field]
        for t in tokenize(text):
            idx[t] = max(idx.get(t, 0.0), weight)
    return idx


_INDEX = [(_index(f), set(tokenize(f["question"])), f) for f in FAQS]


def band(score):
    """Return (label, meaning) for a confidence score."""
    for low, high, label, meaning in BANDS:
        if low <= score <= high:
            return label, meaning
    return "No match", ""


def search(query, top=1):
    """Return up to `top` results: dicts with id, category, question, answer, confidence, band."""
    q = list(dict.fromkeys(tokenize(query)))
    if not q:
        return []
    scored = []
    for idx, qtokens, faq in _INDEX:
        points = sum(idx.get(t, 0.0) for t in q)
        if points <= 0:
            continue
        conf = min(100, int(points / (WEIGHTS["question"] * len(q)) * 100 + 0.5))
        cover = int(sum(1 for t in qtokens if t in q) * 1000 / max(1, len(qtokens)))
        scored.append((conf, cover, faq))
    scored.sort(key=lambda s: (-s[0], -s[1], s[2]["id"]))
    out = []
    for conf, _c, faq in scored[:top]:
        label, _m = band(conf)
        out.append({"id": faq["id"], "category": faq["category"], "question": faq["question"],
                    "answer": faq["answer"], "confidence": conf, "band": label})
    return out


def ask(query):
    """Return the single best result, or None when nothing matches."""
    r = search(query, 1)
    return r[0] if r else None


def get_faq(faq_id):
    """Return one FAQ by number (1 to 35), or None."""
    for f in FAQS:
        if f["id"] == int(faq_id):
            return dict(f)
    return None


def by_category(category):
    """Return all FAQs in a category."""
    return [dict(f) for f in FAQS if f["category"] == category]


def to_jsonld(faqs):
    """FAQPage JSON-LD for a list of FAQs."""
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage",
                       "mainEntity": [{"@type": "Question", "name": f["question"],
                                       "acceptedAnswer": {"@type": "Answer", "text": f["answer"]}} for f in faqs]},
                      indent=2, ensure_ascii=False)


def export(fmt="markdown", category=None):
    """Generate the FAQ (all or one category) as markdown, json, jsonld or html."""
    faqs = by_category(category) if category else [dict(f) for f in FAQS]
    title = "Street Insider Press Release FAQ"
    if fmt == "json":
        return json.dumps([{"question": f["question"], "answer": f["answer"]} for f in faqs], indent=2, ensure_ascii=False) + "\n"
    if fmt == "jsonld":
        return to_jsonld(faqs) + "\n"
    if fmt == "html":
        items = "\n".join(f"  <h3>{html.escape(f['question'])}</h3>\n  <p>{html.escape(f['answer'])}</p>" for f in faqs)
        return (f"<section class=\"si-faq\">\n  <h2>{html.escape(title)}</h2>\n{items}\n</section>\n"
                f"<script type=\"application/ld+json\">\n{to_jsonld(faqs)}\n</script>\n")
    lines = [f"# {title}", ""]
    for f in faqs:
        lines += [f"## {f['id']}. {f['question']}", "", f["answer"], ""]
    lines.append(f"*Generated by the BHMarketer Street Insider FAQ Generator. Learn more: {SERVICE_PAGE}*")
    return "\n".join(lines) + "\n"


USAGE = __doc__


def main(argv=None):
    args = sys.argv[1:] if argv is None else list(argv)
    if not args or args[0] in ("-h", "--help"):
        print(USAGE)
        return 0
    if args[0] == "--version":
        print(__version__)
        return 0
    if args[0] == "--categories":
        for c, d in CATEGORIES.items():
            print(f"{c:18} {len(by_category(c)):>2}  {d}")
        return 0
    if args[0] == "--list":
        items = by_category(args[1]) if len(args) > 1 else FAQS
        if not items:
            print("Unknown category. Try --categories")
            return 1
        for f in items:
            print(f"{f['id']:>2}. {f['question']}")
        return 0
    if args[0] == "--id":
        f = get_faq(args[1]) if len(args) > 1 and args[1].isdigit() else None
        if not f:
            print("FAQ number must be 1 to 35")
            return 1
        print(f"Q{f['id']}. {f['question']}\n{f['answer']}")
        return 0
    if args[0] == "--export":
        fmt = args[1] if len(args) > 1 else "markdown"
        cat = args[2] if len(args) > 2 else None
        if fmt not in ("markdown", "json", "jsonld", "html") or (cat and cat not in CATEGORIES):
            print("Use: --export markdown|json|jsonld|html [category]")
            return 1
        sys.stdout.write(export(fmt, cat))
        return 0

    as_json = False
    top = 1
    if args[0] == "--json":
        as_json, args = True, args[1:]
    if args and args[0] == "--top":
        top, args = int(args[1]), args[2:]
    query = " ".join(args)
    results = search(query, top)

    if as_json:
        print(json.dumps({"query": query, "results": results}, indent=2, ensure_ascii=False))
        return 0 if results else 1
    if not results:
        print("No matching FAQ found. Try --list to browse all 35 questions,")
        print(f"or contact BHMarketer.ai support: {WEBSITE}/contact/")
        return 1
    for r in results:
        print(f"Q{r['id']}. {r['question']}  [{r['category']}]")
        print(f"   {r['answer']}")
        print(f"   Confidence: {r['confidence']}/100 ({r['band']})\n")
    print(f"BHMarketer Street Insider FAQ Generator v{__version__}  |  {SERVICE_PAGE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
