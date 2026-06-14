import { isSidebarlessRoute } from "./route-policy";

describe("route-policy", () => {
  describe("isSidebarlessRoute", () => {
    it("hides sidebar for root and API paths", () => {
      expect(isSidebarlessRoute("/")).toBe(true);
      expect(isSidebarlessRoute("/api/chat")).toBe(true);
      expect(isSidebarlessRoute("/api/sessions/123")).toBe(true);
    });

    it("shows sidebar for app pages", () => {
      expect(isSidebarlessRoute("/chat")).toBe(false);
      expect(isSidebarlessRoute("/chat/last")).toBe(false);
      expect(isSidebarlessRoute("/knowledge")).toBe(false);
      expect(isSidebarlessRoute("/about")).toBe(false);
    });
  });
});
