require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function translateContent(content, language) {
  const prompt = `
      You are an expert in Web3 and blockchain technology. Translate the following technical documentation from English to ${language}, preserving all technical terms, code snippets, and specialized terminology related to decentralized applications (dApps), blockchain, smart contracts, and related concepts. Do not translate the technical terms and keep the translation accurate for developers:
    
      ${content}
    `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.6-sol",
      messages: [{ role: "system", content: prompt }],
      max_completion_tokens: 16384,
      // Note: gpt-5.6-sol (reasoning model) only supports the default temperature (1);
      // passing any other value returns a 400, so temperature is intentionally omitted.
    });

    const choice = response.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new Error(
        "Translation truncated (finish_reason: length); raise max_completion_tokens or split the input."
      );
    }

    const translated = choice?.message?.content;
    if (typeof translated !== "string" || translated.trim() === "") {
      throw new Error(
        `Translation returned no content (finish_reason: ${choice?.finish_reason ?? "unknown"}).`
      );
    }

    return translated.trim();
  } catch (error) {
    console.error("Error translating content:", error);
    throw error;
  }
}
module.exports = { translateContent };
