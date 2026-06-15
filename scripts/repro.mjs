import { chromium } from "playwright";

const URL = process.argv[2] || "http://127.0.0.1:3000/game/CC43R";
const errors = [];
const logs = [];

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const page = await browser.newPage();

page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}\n${e.stack ?? ""}`));
page.on("requestfailed", (r) =>
  errors.push(`REQFAIL: ${r.url()} -> ${r.failure()?.errorText}`)
);

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch((e) =>
  errors.push("GOTO: " + e.message)
);
await page.waitForTimeout(5000);

const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 300);
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);

console.log("==== BODY TEXT ====\n" + (bodyText || "(KOSONG / BLANK)"));
console.log("\n==== body bg ====", bg, "| canvas:", canvasCount);
console.log("\n==== PAGE ERRORS (" + errors.length + ") ====");
errors.forEach((e) => console.log(e + "\n"));
console.log("==== CONSOLE (error/warn only) ====");
logs.filter((l) => /error|warn/i.test(l)).slice(0, 30).forEach((l) => console.log(l));

await browser.close();
