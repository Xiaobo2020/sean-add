const { danger, message } = require("danger");
const {
  git: {
    created_files: createdFiles,
    modified_files: modifiedFiles,
    structuredDiffForFile,
  },
} = danger;

const fileChanges = [...modifiedFiles, ...createdFiles];

fileChanges.map(async (filename) => {
  const res = await structuredDiffForFile(filename);
  res.chunks.map((chunk) => {
    const addedLines = chunk.changes.reduce((lines, cur) => {
      if (cur.type === "add") {
        return [...lines, cur.ln];
      }
      return lines;
    }, []);

    if (addedLines.length >= 2) {
      message(
        "test inline comment trigged by DangerJS",
        filename,
        addedLines[addedLines.length - 1]
      );
    }
  });
  return true;
});

message("test normal comment trigged by DangerJS");
