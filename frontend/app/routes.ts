import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("components/layout/index.tsx", [
    index("pages/ServerList/index.tsx"),
    route("server/:id", "pages/ServerDetail/index.tsx"),
    route("compare", "pages/ServerComparison/index.tsx"),
    route("account/*", "pages/Account/index.tsx"),
    route("terms", "pages/Terms.tsx"),
    route("privacy", "pages/Privacy.tsx"),
    route("*", "routes/catchall.tsx"),
  ]),
  route("admin", "pages/AdminDashboard/index.tsx", { id: "admin" }),
  route("dashboard", "pages/AdminDashboard/index.tsx", { id: "dashboard" }),
  route("dashboard/:subview", "pages/AdminDashboard/index.tsx", { id: "dashboard-subview" }),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("api/favicon/:id", "routes/favicon.ts"),
  route("api/labymod/manifest", "routes/labymodManifest.ts"),
  route("robots.txt", "routes/robots.ts"),
] satisfies RouteConfig;
