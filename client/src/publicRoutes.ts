import ApiPlayground from "./marketing/ApiPlayground";
import MarketingHome from "./marketing/MarketingHome";
import TrustCenter from "./marketing/TrustCenter";

export const publicRoutes = [
  { path: "/product", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/features", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/trust", component: TrustCenter, boundary: "implemented-control-inventory" },
  { path: "/docs", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/security", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/api-playground", component: ApiPlayground, boundary: "synthetic-read-only" },
] as const;
