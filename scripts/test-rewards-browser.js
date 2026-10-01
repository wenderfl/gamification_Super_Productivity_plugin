import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.setViewport({ width: 1320, height: 1000 });
await page.evaluateOnNewDocument(() => {
  window.__failWrite = false;
  window.__failRead = false;
  const key = "qa-gamification",
    hour = 3600000;
  const dateKey = (d) =>
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const day = dateKey(monday);
  window.PluginAPI = {
    getTasks: async () => {
      if (window.__failRead) throw Error("Falha simulada");
      return [
        {
          id: "parent",
          projectId: "study",
          timeSpentOnDay: { [day]: 12 * hour },
        },
        {
          id: "child",
          parentId: "parent",
          timeSpentOnDay: { [day]: 10 * hour },
        },
        { id: "work", projectId: "work", timeSpentOnDay: { [day]: 3 * hour } },
      ];
    },
    getArchivedTasks: async () => [
      { id: "parent", projectId: "study", timeSpentOnDay: { [day]: 2 * hour } },
    ],
    getAllProjects: async () => [
      { id: "study", title: "Study" },
      { id: "work", title: "Work" },
    ],
    loadSyncedData: async () => localStorage.getItem(key),
    persistDataSynced: async (data) => {
      if (window.__failWrite) throw Error("Falha de gravação simulada");
      localStorage.setItem(key, data);
    },
  };
});
const url =
  "file://" +
  path.resolve(process.env.PLUGIN_HTML || "gamification/index.html");
const waitReady = () =>
  page.waitForFunction(
    () =>
      !document.body.classList.contains("loading") &&
      document.getElementById("balance").textContent !== "—",
  );
async function fill(selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value,
  );
}
async function saveReward() {
  await page.click("#save-reward");
  await page.waitForFunction(
    () => !document.getElementById("reward-dialog").open,
  );
}
async function add(name, cost, kind = "Filme") {
  await page.click("#add");
  await fill("#reward-name", name);
  await fill("#reward-cost", String(cost));
  await page.select("#reward-kind", kind);
}
try {
  await page.goto(url);
  await page.evaluate(() => localStorage.removeItem("qa-gamification"));
  await page.reload();
  await waitReady();
  assert.equal(await page.$eval("#balance", (e) => e.textContent), "15h");
  await page.click("#settings-open");
  await page.select("#project-select", "study");
  await page.click("#settings-form [type=submit]");
  await page.waitForFunction(
    () => !document.getElementById("settings-dialog").open,
  );
  assert.equal(await page.$eval("#balance", (e) => e.textContent), "12h");
  // File path → optimized embedded image → synced persistence.
  await add("Movie night", 2);
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 720;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 720, 720);
    g.addColorStop(0, "#25818d");
    g.addColorStop(1, "#16283e");
    x.fillStyle = g;
    x.fillRect(0, 0, 720, 720);
    x.fillStyle = "#ffffffaa";
    x.beginPath();
    x.moveTo(285, 225);
    x.lineTo(285, 495);
    x.lineTo(475, 360);
    x.closePath();
    x.fill();
    return c.toDataURL("image/png").split(",")[1];
  });
  const upload = path.resolve("assets/qa-upload.png");
  fs.writeFileSync(upload, Buffer.from(png, "base64"));
  await page.click("#file-tab");
  await (await page.$("#image-file")).uploadFile(upload);
  await page.waitForFunction(() =>
    document.getElementById("image-status").textContent.includes("ready"),
  );
  await saveReward();
  assert.match(
    await page.$eval(".card img", (img) => img.src),
    /^data:image\/jpeg;base64,/,
  );
  await page.reload();
  await waitReady();
  assert.equal(
    await page.$eval(".card h3", (e) => e.textContent),
    "Movie night",
  );
  assert.match(
    await page.$eval(".card img", (img) => img.src),
    /^data:image\/jpeg/,
  );
  // Image URL with a deterministic image response.
  await page.setRequestInterception(true);
  page.on("request", (req) =>
    req.url() === "https://images.example.test/poster.png"
      ? req.respond({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        })
      : req.continue(),
  );
  await add("Next game", 4, "Jogo");
  await fill("#image-url", "https://images.example.test/poster.png");
  await saveReward();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll(".card img")).some(
      (i) => i.src.includes("example.test") && i.complete && i.naturalWidth > 0,
    ),
  );
  await add("Coffee break", 1, "Experiência");
  await saveReward();
  await add("New headphones", 20, "Item");
  await saveReward();
  await add("A new book", 6, "Item");
  await saveReward();
  assert.equal(await page.$$eval(".card", (xs) => xs.length), 5);
  assert.equal(
    await page.$eval(".card:nth-child(4) .redeem", (e) => e.disabled),
    true,
  );
  await page.evaluate(() => (document.getElementById("toast").hidden = true));
  await page.screenshot({ path: "assets/rewards-desktop.png", fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: "assets/rewards-mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Mobile overflow",
  );
  await page.setViewport({ width: 1320, height: 1000 });
  // Redemption must debit exactly once; undo restores it.
  await page.click(".card .redeem");
  await page.click("#confirm-action");
  await page.waitForFunction(
    () => !document.getElementById("confirm-dialog").open,
  );
  assert.equal(await page.$eval("#balance", (e) => e.textContent), "10h");
  await page.reload();
  await waitReady();
  assert.equal(await page.$eval("#balance", (e) => e.textContent), "10h");
  await page.click("#history-tab");
  assert.equal(await page.$$eval(".history-row", (xs) => xs.length), 1);
  await page.click(".undo");
  await page.click("#confirm-action");
  await page.waitForFunction(
    () => !document.getElementById("confirm-dialog").open,
  );
  assert.equal(await page.$eval("#balance", (e) => e.textContent), "12h");
  // Search/list preferences and stored URL survive reload.
  await page.click("#catalog-tab");
  await page.click("#list-view");
  await page.waitForFunction(() =>
    document.getElementById("cards").classList.contains("list"),
  );
  await fill("#search", "Movie");
  assert.equal(await page.$$eval(".card", (xs) => xs.length), 1);
  await fill("#search", "");
  await page.reload();
  await waitReady();
  assert.equal(
    await page.$eval("#cards", (e) => e.classList.contains("list")),
    true,
  );
  // Failed save must leave the form open without adding a phantom reward.
  await add("Não deve ser salvo", 3);
  await page.evaluate(() => (window.__failWrite = true));
  await page.click("#save-reward");
  await page.waitForFunction(() =>
    document
      .getElementById("form-error")
      .textContent.includes("Falha de gravação"),
  );
  assert.equal(await page.$$eval(".card", (xs) => xs.length), 5);
  await page.evaluate(() => (window.__failWrite = false));
  await page.click("#reward-dialog [data-close]");
  // Rename safely (no data interpolated into HTML), then delete; preserve ledger.
  await page.click(".card .edit-card");
  await fill("#reward-name", "<img src=x onerror=alert(1)>");
  await saveReward();
  assert.equal(await page.$eval(".card h3", (e) => e.children.length), 0);
  await page.click(".card .edit-card");
  await page.click("#delete-reward");
  await page.click("#confirm-action");
  await page.waitForFunction(
    () => !document.getElementById("confirm-dialog").open,
  );
  assert.equal(await page.$$eval(".card", (xs) => xs.length), 4);
  await page.click("#history-tab");
  assert.equal(await page.$$eval(".history-row", (xs) => xs.length), 1);
  // If the host cannot provide the tracked hours, do not allow redemptions.
  await page.evaluate(() => {
    window.__failRead = true;
    window.postMessage({ type: "SP_STATE_CHANGED" }, "*");
  });
  await page.waitForFunction(() =>
    document
      .getElementById("notice-text")
      .textContent.includes("Redemptions paused"),
  );
  await page.click("#catalog-tab");
  assert.equal(
    await page.$$eval(".redeem", (xs) => xs.every((x) => x.disabled)),
    true,
  );
  assert.deepEqual(errors, []);
  fs.unlinkSync(upload);
  console.log(
    "PASS: host API integration mock, deduplication, project filter, upload, image URL, persistence/reload, redeem, undo, insufficient balance, list/search, edit/delete, XSS safety, write/read failure, desktop/mobile layout.",
  );
} finally {
  await browser.close();
}
