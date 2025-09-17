function stripCodeFences(text) {
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Failed to parse JSON content from language model response.');
  }
}

export function extractFirstJsonArray(text) {
  if (!text) {
    throw new Error('Empty response from language model while expecting a JSON array.');
  }

  const stripped = stripCodeFences(text.trim());
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');

  if (start !== -1 && end !== -1 && end > start) {
    const jsonSlice = stripped.slice(start, end + 1);
    return safeParse(jsonSlice);
  }

  const parsed = safeParse(stripped);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array but received a different structure.');
  }
  return parsed;
}

export function extractFirstJsonObject(text) {
  if (!text) {
    throw new Error('Empty response from language model while expecting a JSON object.');
  }

  const stripped = stripCodeFences(text.trim());
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    const jsonSlice = stripped.slice(start, end + 1);
    return safeParse(jsonSlice);
  }

  const parsed = safeParse(stripped);
  if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
    throw new Error('Expected a JSON object but received a different structure.');
  }
  return parsed;
}
