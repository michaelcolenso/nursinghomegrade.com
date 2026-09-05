import { readFileSync, writeFileSync } from "node:fs";

const path = "src/templates/explore.ts";
const lines = readFileSync(path, "utf8").split("\n");
const i = lines.findIndex((line) => line.includes("Not rated") && line.includes("Grade ${f.g}"));
if (i < 0) throw new Error("Explore NR popup line not found");
lines[i] = '                    <div style="font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.25rem;">\\${f.g === "NR" || Number(f.s) < 0 ? "Not rated" : "Grade " + f.g + " (" + f.s + "/100)"}</div>';
writeFileSync(path, lines.join("\n"));
console.log("Fixed Explore NR popup nested template literal.");
