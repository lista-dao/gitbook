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
    const fileChanges = diffOutput
      .split("\n")
      .filter((line) => {
        const [status, ...fileParts] = line.split(/\s+/);
        return Boolean(status) && Boolean(fileParts[0]);
      })
      .map((line) => {
        const [status, ...fileParts] = line.split(/\s+/);
        if (line.endsWith(".md")) {
          if (status.startsWith("R")) {
            return { status, oldFile: fileParts[0], file: fileParts[1] };
          }
          return { status, file: fileParts[0] };
        }

        return { status, file: fileParts?.[1] ?? fileParts[0] };
      });
    return fileChanges;
  } catch (error) {
    console.error("Error getting changed files:", error);
    throw error;
  }
}

const deleteFile = (file) => {
  if (fs.existsSync(file)) {
    console.log(`Deleting file: ${file}`);
    fs.unlinkSync(file);
  }
};
async function syncAndTranslate() {
  const changedFiles = getChangedFiles();
  console.log(`Changed files: ${JSON.stringify(changedFiles, null, 2)}`);

  for (const branch of languageBranches) {
    try {
      execSync(`git checkout ${branch}`);

      for (const { status, file, oldFile } of changedFiles) {
        const targetFile = path.join(process.cwd(), file);
        console.log(`Processing file: ${file} with status: ${status}`);
        if (file.endsWith(".md")) {
          if (status === "D") {
            deleteFile(targetFile);
          } else {
            if (oldFile) {
              const oldFilePath = path.join(process.cwd(), oldFile);
              deleteFile(oldFilePath);
            }
            execSync(`git checkout origin/en -- ${file}`);
            const content = fs.readFileSync(targetFile, "utf-8");
            const translatedContent = await translateContent(content, branch);
            fs.writeFileSync(targetFile, translatedContent, "utf-8");
          }
        } else execSync(`git checkout origin/en -- ${file}`);
      }
      execSync(`git add .`);
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
