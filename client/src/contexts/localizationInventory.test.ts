import { describe, expect, it } from "vitest";
import { authenticatedLocalizationRoutes, localeParticipation } from "./localizationInventory";
import { authenticatedRoutes } from "@/authenticatedRoutes";

describe("authenticated-route localization inventory", () => {
  it("requires all dashboard surfaces to participate in shared localization", () => {
    expect(authenticatedLocalizationRoutes).toHaveLength(19);
    expect(authenticatedLocalizationRoutes).toEqual(authenticatedRoutes.map(route => route.path));
    authenticatedLocalizationRoutes.forEach(route => expect(localeParticipation[route]).toEqual(["shared-navigation", "static-interface-copy", "locale-formats"]));
  });
});
