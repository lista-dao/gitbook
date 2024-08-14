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
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 4096,
      temperature: 0.2,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error translating content:", error);
    throw error;
  }
}
module.exports = { translateContent };
