require("dotenv").config();
const OpenAI = require("openai");

// Constructed on first use, not at import time: the OpenAI client throws
// when OPENAI_API_KEY is unset, which would otherwise take down anything that
// merely requires this module (including the tests).
let client;
function openai() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const MODEL = process.env.TRANSLATE_MODEL || "gpt-4o";

async function translateContent(content, language, label = "content") {
  const prompt = `
      You are an expert in Web3 and blockchain technology. Translate the following technical documentation from English to ${language}, keeping it accurate for developers.

      Translate everything a reader sees, including headings, table headers, table cells, list items, and the text of every link -- the part inside the square brackets. "See the [Smart Contract](x.md) page" must come out with that label in ${language}, not left in English.

      Leave unchanged, exactly as given: link targets and URLs, contract addresses, HTML tags, anything inside backticks or a fenced code block, contract / function / parameter / event names, token symbols, and product names (Lista Lending, Moolah, slisBNB, lisUSD and the like). Everything else is prose and must be translated, including ordinary words that happen to appear in a technical document -- Ethereum, Treasury, Governance, Mechanics, Delegation, Integration Patterns.

      Translate the document in full. Never truncate, summarise, or omit sections, tables, or table rows:

      ${content}
    `;

  const response = await openai().chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: prompt }],
    temperature: 0.2,
  });

  const choice = response.choices[0];
  const translated = choice.message.content.trim();

  // A truncated translation is worse than a failed one: it lands on the site
  // looking complete. Pages used to be silently cut off at the old 4096
  // max_tokens cap (multi-oracle-standard ended mid-`<td>` at 41% of source).
  if (choice.finish_reason && choice.finish_reason !== "stop") {
    throw new Error(
      `Translation of ${label} stopped early (finish_reason: ${choice.finish_reason})`
    );
  }
  assertNotTruncated(content, translated, label);

  return translated;
}

function assertNotTruncated(source, translated, label) {
  // Chinese runs roughly a third the character count of English, so compare
  // structure rather than length: markup and headings survive translation.
  const count = (text, re) => (text.match(re) || []).length;
  // Headings and table markup inside a fenced code block are sample text, not
  // structure; counting them would fail translations that legitimately
  // reformat a code sample.
  const outsideCode = (text) => text.replace(/^```[\s\S]*?^```/gm, "");

  const checks = [
    ["headings", /^#{1,6} /gm, outsideCode],
    ["table rows", /<tr[\s>]/g, outsideCode],
    ["code fences", /^```/gm, (t) => t],
    ["contract addresses", /0x[0-9a-fA-F]{40}/g, (t) => t],
  ];

  for (const [name, re, scope] of checks) {
    const want = count(scope(source), re);
    const got = count(scope(translated), re);
    if (got < want) {
      throw new Error(
        `Translation of ${label} looks truncated: ${got}/${want} ${name} survived`
      );
    }
  }

  if (/<[a-zA-Z/][^>]*$/.test(translated)) {
    throw new Error(`Translation of ${label} ends inside an unclosed HTML tag`);
  }
}

module.exports = { translateContent, assertNotTruncated };
