const fs = require("fs");
const path = require("path");

function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes("node_modules")) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith(".md")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function findFilesWithListaLinks() {
  const rootDir = path.join(__dirname, "..");
  const allMdFiles = findMarkdownFiles(rootDir);
  const filesWithLinks = [];

  for (const file of allMdFiles) {
    const content = fs.readFileSync(file, "utf-8");
    if (content.includes("https://lista.org")) {
      filesWithLinks.push(file);
    }
  }

  return filesWithLinks;
}

function getCampaignName(filePath) {
  const fileName = path.basename(filePath, ".md");
  return fileName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function addUtmToUrl(url, campaign) {
  url = url.replace(/\/$/, "");

  const hasQuery = url.includes("?");
  const separator = hasQuery ? "&" : "?";

  const utmParams = `utm_source=gitbook&utm_medium=article&utm_campaign=${encodeURIComponent(
    campaign
  )}`;

  return `${url}${separator}${utmParams}`;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const campaign = getCampaignName(filePath);

  const linkRegex = /(https:\/\/lista\.org[^\s\)\]"]*)/g;

  let modifiedContent = content;
  let modified = false;

  modifiedContent = modifiedContent.replace(linkRegex, (match) => {
    // 如果链接已经包含 utm_source，跳过
    if (match.includes("utm_source=")) {
      return match;
    }

    modified = true;
    return addUtmToUrl(match, campaign);
  });

  if (modified) {
    fs.writeFileSync(filePath, modifiedContent, "utf-8");
    console.log(`✓ Updated: ${filePath} (campaign: ${campaign})`);
    return true;
  }

  return false;
}

function main() {
  console.log("Finding files with lista.org links...\n");

  const files = findFilesWithListaLinks();
  console.log(`Found ${files.length} files with lista.org links\n`);

  let updatedCount = 0;

  for (const file of files) {
    if (processFile(file)) {
      updatedCount++;
    }
  }

  console.log(`\n✓ Done! Updated ${updatedCount} files.`);
}

main();
