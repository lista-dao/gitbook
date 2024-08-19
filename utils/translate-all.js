const { execSync } = require("child_process");
const fs = require("fs");
const glob = require("glob");
const util = require("util");
const { translateContent } = require("./translate-content");

const batchSize = 5;

const branch = process.argv[2]; // Example: 'zh-CN'
console.log("🚀 ~ branch:", branch);
if (!branch) {
  console.error('Please provide a language branch name, e.g., "zh-CN".');
  process.exit(1);
}

async function translateAllMarkdownFiles() {
  try {
    const files = glob.sync("**/*.md", { ignore: ["node_modules/**"] });

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (file) => {
          const content = fs.readFileSync(file, "utf-8");
          const translatedContent = await translateContent(content, branch);
          fs.writeFileSync(file, translatedContent, "utf-8");
          // execSync(`git add ${file}`);
        })
      );
    }

    // execSync(`git commit -m "Initial translation to ${branch}"`);
    // execSync(`git push --set-upstream origin ${branch}`);
  } catch (err) {
    console.error("Error processing markdown files:", err);
    process.exit(1);
  }
}

translateAllMarkdownFiles();
