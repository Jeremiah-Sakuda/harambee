import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
export function sourceFingerprint(
  files = [
    "server/domain.mjs",
    "server/paypal.mjs",
    "server/sandbox-lab.mjs",
    "server/group-payments.mjs",
    "server/store.mjs",
  ],
) {
  return {
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    testedFilesModified: !!execFileSync(
      "git",
      ["status", "--porcelain", "--", ...files],
      { cwd: root, encoding: "utf8" },
    ).trim(),
    sha256: Object.fromEntries(
      files.map((file) => [
        file,
        createHash("sha256")
          .update(readFileSync(new URL(`../../${file}`, import.meta.url)))
          .digest("hex"),
      ]),
    ),
  };
}
