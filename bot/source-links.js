function getBestExternalTitle(content) {
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("# ") &&
      !trimmed.startsWith("## ") &&
      trimmed.length > 10
    ) {
      const title = trimmed.substring(2).trim();
      if (
        title &&
        !title.includes("\\") &&
        !title.startsWith("1.") &&
        !title.startsWith("2.")
      ) {
        return title;
      }
    }
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1].trim();

    if (currentLine && nextLine && /^=+$/.test(nextLine) && currentLine.length > 10) {
      return currentLine;
    }
  }

  return null;
}

function getFallbackDisplayName(fileChunks, filename) {
  const mainTopic = fileChunks.find((c) => c.metadata.main_topic)?.metadata.main_topic;
  if (mainTopic && mainTopic.trim() && mainTopic !== "README") {
    return mainTopic.trim();
  }

  const firstHeading = fileChunks.find((c) => c.metadata.heading)?.metadata.heading;
  if (firstHeading && firstHeading.trim() && firstHeading !== "README") {
    return firstHeading.trim();
  }

  const summary = fileChunks.find((c) => c.metadata.summary)?.metadata.summary;
  if (summary && summary.trim()) {
    return summary.substring(0, 30).trim() + (summary.length > 30 ? "..." : "");
  }

  const pathParts = filename.replace(/\.md$/, "").split("/");
  const lastPart = pathParts[pathParts.length - 1];
  const normalized =
    lastPart === "README" && pathParts.length > 1
      ? pathParts[pathParts.length - 2]
      : lastPart;

  return normalized.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveDisplayName(fileChunks, filename) {
  const isExternalContent = fileChunks.some(
    (chunk) => chunk.metadata.is_external_content || chunk.metadata.source_url,
  );

  if (isExternalContent) {
    for (const chunk of fileChunks) {
      const content = chunk.metadata.chunk_content || chunk.metadata.content || "";
      const title = getBestExternalTitle(content);
      if (title) return title;
    }
  }

  return getFallbackDisplayName(fileChunks, filename);
}

function toInternalDocLink(filename) {
  const urlPath = filename.replace(/\.md$/, "");
  const pathEncoded = urlPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://docs.bsc.lista.org/${pathEncoded}`.replace("/README", "");
}

function buildSourceLinks(
  relevantChunks,
  language,
  getChunkRankingScore,
  options = {},
) {
  const { maxFiles = 6 } = options;
  const fileScores = new Map();
  const fileChunksMap = new Map();

  relevantChunks.forEach((chunk) => {
    const filename = chunk.metadata.filename;
    if (!fileChunksMap.has(filename)) fileChunksMap.set(filename, []);
    fileChunksMap.get(filename).push(chunk);
  });

  fileChunksMap.forEach((chunks, filename) => {
    const avgScore =
      chunks.reduce((sum, chunk) => sum + getChunkRankingScore(chunk), 0) /
      chunks.length;
    fileScores.set(filename, avgScore);
  });

  const topFiles = [...fileScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxFiles)
    .map(([filename]) => filename);

  const sourceLinks = topFiles
    .filter((filename) => !filename.includes("SUMMARY"))
    .map((filename) => {
      const fileChunks = relevantChunks.filter(
        (chunk) => chunk.metadata.filename === filename,
      );
      const displayName = resolveDisplayName(fileChunks, filename);

      const externalSourceUrl = fileChunks.find((chunk) => chunk.metadata.source_url)
        ?.metadata.source_url;
      const isExternalContent = fileChunks.some(
        (chunk) => chunk.metadata.is_external_content || chunk.metadata.source_url,
      );
      const sourceType = fileChunks.find((chunk) => chunk.metadata.source_type)
        ?.metadata.source_type;

      if (isExternalContent && externalSourceUrl) {
        return `[${displayName}](${externalSourceUrl})`;
      }

      // Manual articles without a known source URL would 404 on docs.bsc.lista.org
      // (they are not part of the published GitBook). Emit title-only to avoid broken links.
      if (sourceType === "manual") {
        return displayName;
      }

      return `[${displayName}](${toInternalDocLink(filename)})`;
    });

  const sourceText =
    language === "zh-CN"
      ? `\n\n📚 **参考来源：** ${sourceLinks.join(", ")}`
      : `\n\n📚 **Sources:** ${sourceLinks.join(", ")}`;

  const disclaimer =
    language === "zh-CN"
      ? "\n\n⚠️ **免责声明：** 以上回答由AI机器人提供，仅供参考。如有疑问或需要确认，请联系管理员。"
      : "\n\n⚠️ **Disclaimer:** The above response is provided by an AI bot for reference only. Please contact moderators if you have questions or need confirmation.";

  return sourceText + disclaimer;
}

module.exports = {
  buildSourceLinks,
};
