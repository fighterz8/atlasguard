export const isResearchPreviewEnabled = (value: unknown): boolean =>
  value === "true";

export const researchPreviewEnabled = isResearchPreviewEnabled(
  import.meta.env.VITE_ENABLE_RESEARCH_PREVIEW,
);
