import MarketingHome from "./marketing/MarketingHome";
import TrustCenter from "./marketing/TrustCenter";
import PublicInfoPage from "./marketing/PublicInfoPage";

export const publicRoutes = [
  { path: "/", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/product", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/features", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/how-it-works", component: PublicInfoPage, boundary: "reviewed-static-copy" },
  { path: "/programs", component: PublicInfoPage, boundary: "reviewed-static-copy" },
  { path: "/researchers", component: PublicInfoPage, boundary: "reviewed-static-copy" },
  { path: "/trust", component: TrustCenter, boundary: "implemented-control-inventory" },
  { path: "/docs", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/blog", component: PublicInfoPage, boundary: "reviewed-static-copy" },
  { path: "/api-playground", component: PublicInfoPage, boundary: "read-only-no-execution" },
  { path: "/security", component: MarketingHome, boundary: "reviewed-static-copy" },
  { path: "/pricing", component: PublicInfoPage, boundary: "informational-no-billing" },
  { path: "/demo", component: PublicInfoPage, boundary: "synthetic-read-only" },
  { path: "/changelog", component: PublicInfoPage, boundary: "reviewed-static-copy" },
  { path: "/roadmap", component: PublicInfoPage, boundary: "reviewed-static-copy" },
  { path: "/status", component: PublicInfoPage, boundary: "non-live-status-disclosure" },
  { path: "/contact", component: PublicInfoPage, boundary: "non-collecting-contact" },
  { path: "/academy", component: PublicInfoPage, boundary: "educational-static-copy" },
  { path: "/privacy", component: PublicInfoPage, boundary: "deployment-reviewed-legal-copy" },
  { path: "/terms", component: PublicInfoPage, boundary: "deployment-reviewed-legal-copy" },
  { path: "/cookies", component: PublicInfoPage, boundary: "deployment-reviewed-legal-copy" },
  { path: "/acceptable-use", component: PublicInfoPage, boundary: "deployment-reviewed-legal-copy" },
  { path: "/responsible-disclosure", component: PublicInfoPage, boundary: "deployment-reviewed-legal-copy" },
  { path: "/data-processing", component: PublicInfoPage, boundary: "deployment-reviewed-legal-copy" },
] as const;
