const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { translateContent } = require("./translate-content");

const languageBranches = ["zh-CN"];

async function translateFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    for (const branch of languageBranches) {
      execSync(`git checkout ${branch}`);
      const translatedContent = await translateContent(fileContent, branch);
      fs.writeFileSync(filePath, translatedContent, "utf-8");
      //   execSync(`git add ${filePath}`);
      //   execSync(`git commit -m "Translate ${filePath} to ${branch}" || true`);
      //   execSync(`git push`);
      console.log(`Translated and pushed ${filePath} to branch: ${branch}`);
    }
  } catch (error) {
    console.error(`Error translating file ${filePath}:`, error);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Please specify a file to translate.");
  process.exit(1);
}

translateFile(path.resolve(filePath)).catch((error) => {
  console.error("Error in translateFile:", error);
});
