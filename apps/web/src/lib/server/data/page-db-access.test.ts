import fs from "fs";
import path from "path";

// Scans page.tsx and layout.tsx — both are Server Components that must go through the data layer.
function findServerComponentFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findServerComponentFiles(fullPath));
    } else if (entry.isFile() && (entry.name === "page.tsx" || entry.name === "layout.tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Server page database access", () => {
  it("keeps Prisma access out of app page and layout components", () => {
    const appDir = path.join(process.cwd(), "src/app");
    const offenders = findServerComponentFiles(appDir).filter((file) => {
      const content = fs.readFileSync(file, "utf8");
      return content.includes("@/lib/server/db/client") || content.includes("prisma.");
    });

    expect(offenders.map((file) => path.relative(process.cwd(), file))).toEqual([]);
  });
});
