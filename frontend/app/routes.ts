import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("ui/layout/index.tsx", [
    index("pages/home/index.tsx"),
    route("server/:id", "pages/server-detail/index.tsx"),
    route("compare", "pages/compare/index.tsx"),
    route("account/*", "pages/account/index.tsx"),
    route("terms", "pages/Terms.tsx"),
    route("privacy", "pages/Privacy.tsx"),
    route("*", "routes/catchall.tsx"),
  ]),
  route("admin", "pages/admin/index.tsx", { id: "admin" }),
  route("dashboard", "pages/admin/index.tsx", { id: "dashboard" }),
  route("dashboard/:subview", "pages/admin/index.tsx", { id: "dashboard-subview" }),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("api/favicon/:id", "routes/favicon.ts"),
  route("api/labymod/manifest", "routes/labymodManifest.ts"),
  route("robots.txt", "routes/robots.ts"),
] satisfies RouteConfig;
