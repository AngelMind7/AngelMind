import { describe, expect, it } from "vitest";
import { authenticatedLocalizationRoutes, localeParticipation } from "./localizationInventory";
import { authenticatedRoutes } from "@/authenticatedRoutes";

describe("authenticated-route localization inventory", () => {
  it("requires every registered dashboard surface to participate in shared localization", () => {
    expect(authenticatedLocalizationRoutes).toHaveLength(authenticatedRoutes.length);
    expect(authenticatedLocalizationRoutes).toEqual(authenticatedRoutes.map(route => route.path));
    authenticatedLocalizationRoutes.forEach(route => expect(localeParticipation[route]).toEqual(["shared-navigation", "static-interface-copy", "locale-formats"]));
  });
});
