---
name: Orval generated hooks need explicit queryKey when using conditional enabled
description: TS2741 "Property 'queryKey' is missing" when passing { query: { enabled } } to a generated useXxx hook without also specifying queryKey.
---

Generated `useXxx(params, options)` hooks (from `@workspace/api-client-react`, Orval + TanStack Query) type-check `options.query` against `UseQueryOptions<TQueryFnData, TError, TData>` with the concrete `params`-derived query key baked into the return type (`UseQueryResult<TData, TError> & { queryKey: QueryKey }`). Passing only `{ query: { enabled: someBool } }` — with no `queryKey` — sometimes fails to satisfy the inferred generic and throws `TS2741: Property 'queryKey' is missing`, even though other call sites in the same file that omit `options` entirely compile fine.

**Why:** the failure is generic-inference-order-dependent (params shape + TData defaulting), not a real missing-property bug — omitting `options` lets the hook infer everything from `params`, but supplying a partial `options.query` object forces stricter structural matching.

**How to apply:** whenever you add `enabled` (or any other conditional query option) to a generated hook call, also pass `queryKey: getXxxQueryKey(sameParamsYouPassedAsFirstArg)` explicitly inside `query: {...}`. This matches the pattern already used elsewhere in the codebase (e.g. `useGetConversationMessages(id, { query: { enabled: !!id, queryKey: getGetConversationMessagesQueryKey(id) } })`).
