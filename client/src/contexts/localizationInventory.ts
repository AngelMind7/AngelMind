import { authenticatedRoutes } from "@/authenticatedRoutes";

export const authenticatedLocalizationRoutes = authenticatedRoutes.map(route => route.path);
export const localeParticipation = Object.fromEntries(authenticatedLocalizationRoutes.map(route => [route, ["shared-navigation", "static-interface-copy", "locale-formats"] as const]));
