import { OpenAI } from 'openai';
import type { NestedComponent } from './analyze.ts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function reviewWithLLM(component: NestedComponent): Promise<string> {
  const prompt = `
You're reviewing React Native code in a GitHub pull request.

The following function appears to be a React component defined inside another component (${component.parentName}) in the file "${component.filePath}" at line ${component.line}.

Please review whether this is a good practice or not. Consider:
- If it's memoized
- If it's used inside a FlatList or SectionList render function
- If it's simple and not worth extracting
- If refactoring would help with performance or readability

Always suggest a cleaner alternative if you think it could be better.

Here is the component code:

\`\`\`tsx
${component.code}
\`\`\`

Respond in markdown. Include a heading and a short explanation.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'developer', content: prompt }],
  });

  return response.choices[0].message.content || 'No feedback generated.';
}