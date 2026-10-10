# Architecture intent — data fetching (frontend)

The React Router SSR is used **for SEO and the initial render only** (sitemap, robots,
search-engines, first paint, and cookie-based language resolution).

Most data requests must stay **client-side**:

- The home page seeds React Query via the SSR loader (so search engines get real content),
  then the client immediately refetches with `include_stats=true` and takes over.
- Keep the client UX fluid: pagination/filters are client-side over the full cached list,
  `include_stats=true` is fetched once globally so charts on every page render without refetch.
- When optimizing the SSR payload (e.g. slimming the server list serialized into the HTML),
  only change what the loader returns — never move the data fetching to the server or
  remove the client-side refetch/fluidity.
- The server language must remain resolved server-side from the cookie/Accept-Language so
  the SSR HTML is rendered in the right language (no post-hydration flicker).