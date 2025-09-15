import { analyzeFile } from "./analyze.ts";
import { getChangedFiles, postCommentToPR } from "./github.ts";
import { reviewWithLLM } from "./reviewer.ts";

async function runReviewAssistant() {
  const files = getChangedFiles();
  const allFindings: {
    file: string;
    line: number;
    suggestion: string;
  }[] = [];

  for (const file of files) {
    const findings = analyzeFile(file);
    for (const component of findings) {
      const suggestion = await reviewWithLLM(component);
      allFindings.push({
        file: component.filePath,
        line: component.line,
        suggestion,
      });
    }
  }

  if (allFindings.length === 0) {
    await postCommentToPR('✅ No nested component patterns were detected that need attention.');
    return;
  }

  const body = `🧠 **Code Review Assistant: Nested Component Detector**

The following potential issues were found in this PR:\n\n${allFindings
    .map(
      (f) =>
        `### 🔍 ${f.file} (line ${f.line})\n${f.suggestion}\n`
    )
    .join('\n---\n')}

---

_This is an automated assistant comment. Feel free to ignore if not relevant._`;

  await postCommentToPR(body);
}

runReviewAssistant().catch((err) => {
  console.error('Review Assistant failed:', err);
});