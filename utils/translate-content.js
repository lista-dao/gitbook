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
      You are an expert in Web3 and blockchain technology. Translate the following technical documentation from English to ${language}, preserving all technical terms, code snippets, and specialized terminology related to decentralized applications (dApps), blockchain, smart contracts, and related concepts. Do not translate the technical terms and keep the translation accurate for developers.

      Translate the document in full. Never truncate, summarise, or omit sections, tables, or table rows. Reproduce every contract address, URL, and HTML tag exactly as given:

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

  const checks = [
    ["headings", /^#{1,6} /gm],
    ["table rows", /<tr[\s>]/g],
    ["code fences", /^```/gm],
    ["contract addresses", /0x[0-9a-fA-F]{40}/g],
  ];

  for (const [name, re] of checks) {
    const want = count(source, re);
    const got = count(translated, re);
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
