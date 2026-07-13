// `all` prefixes are reserved for a future bulk-invalidate use case (e.g.
// logout); current call sites use the precise `list()`/`detail(id)` keys so
// invalidating one resource never touches an unrelated cached query.
export const queryKeys = {
  sessions: {
    all: ["sessions"] as const,
    list: () => ["sessions", "list"] as const,
    detail: (id: string) => ["sessions", "detail", id] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: () => ["documents", "list"] as const,
  },
  sampleQuestions: {
    all: ["sample-questions"] as const,
  },
} as const;
