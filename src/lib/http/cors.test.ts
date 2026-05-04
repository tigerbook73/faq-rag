import { corsPreflightResponse, withCors } from "./cors";

describe("cors helpers", () => {
  it("allows Expo Web local preflight requests", () => {
    const req = new Request("http://127.0.0.1:3000/api/chat", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:8081" },
    });

    const res = corsPreflightResponse(req);

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("adds CORS headers to API responses for allowed origins", () => {
    const req = new Request("http://127.0.0.1:3000/api/chat", {
      headers: { Origin: "http://localhost:8081" },
    });

    const res = withCors(Response.json({ ok: true }), req);

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081");
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});
