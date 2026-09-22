export const DEFAULT_LEAD_PAGE_SIZE = 25;
export const MAX_LEAD_PAGE_SIZE = 100;

/** Keep database limits and offsets finite, including for hand-edited URLs. */
export function getLeadPageBounds(total: number, requestedPage?: number, requestedPageSize?: number) {
  const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize! > 0
    ? Math.min(requestedPageSize!, MAX_LEAD_PAGE_SIZE)
    : DEFAULT_LEAD_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Number.isSafeInteger(requestedPage) && requestedPage! > 0
    ? Math.min(requestedPage!, totalPages)
    : 1;

  return { page, pageSize, totalPages, offset: (page - 1) * pageSize };
}

/** Search text is literal; PostgreSQL LIKE metacharacters are not user filters. */
export function leadSearchPattern(value?: string): string | undefined {
  const term = value?.trim().slice(0, 120);
  return term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : undefined;
}

export function normalizeLeadProductFilter(productId?: number, relation?: string) {
  const productRelation = relation && ["interest", "existing", "sold", "none"].includes(relation)
    ? relation
    : undefined;
  // "Ohne Produktprofil" describes the whole lead, regardless of a stale product select.
  const validProductId = productRelation !== "none" && Number.isSafeInteger(productId) && productId! > 0
    ? productId
    : undefined;
  return { productId: validProductId, productRelation };
}
