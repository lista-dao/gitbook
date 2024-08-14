const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { translateContent } = require("./translate-content");

const languageBranches = ["zh-CN"];

function getChangedFiles() {
  try {
    const diffOutput = execSync("git diff --name-status HEAD~1 HEAD", {
      encoding: "utf8",
    });
    const files = diffOutput.split("\n").filter((line) => line.endsWith(".md"));
    const fileChanges = files.map((line) => {
      const [status, file] = line.split(/\s+/);
      return { status, file };
    });
    return fileChanges;
  } catch (error) {
    console.error("Error getting changed files:", error);
    throw error;
  }
}

async function syncAndTranslate() {
  const changedFiles = getChangedFiles();
  console.log(`Changed files: ${JSON.stringify(changedFiles, null, 2)}`);

  for (const branch of languageBranches) {
    try {
      execSync(`git checkout ${branch}`);

      for (const { status, file } of changedFiles) {
        const targetFile = path.join(process.cwd(), file); // Ensure the correct path
        console.log(`Processing file: ${file} with status: ${status}`);

        if (status === "D") {
          if (fs.existsSync(targetFile)) {
            console.log(`Deleting file: ${targetFile}`);
            fs.unlinkSync(targetFile);
          }
        } else {
          const content = fs.readFileSync(
            path.join(process.cwd(), file),
            "utf-8"
          );
          const translatedContent = await translateContent(content, branch);
          fs.writeFileSync(targetFile, translatedContent, "utf-8");
          console.log(`Translated content written to: ${targetFile}`);
        }

        execSync(`git add ${targetFile}`);
        console.log(`Added file to git: ${targetFile}`);
      }

      execSync(
        `git commit -m "Sync and translate ${changedFiles.length} files to ${branch}" || true`
      );
      console.log(`Committed changes to branch: ${branch}`);

      execSync(`git push`);
    } catch (error) {
      console.error(`Error processing branch ${branch}:`, error);
    }
  }
}

syncAndTranslate().catch((error) => {
  console.error("Error in syncAndTranslate:", error);
});
