const puppeteer = require("puppeteer-core");
const fs = require("fs");

const OUT_DIR = process.argv[2];
const STAMP = process.argv[3];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: [
      "--use-fake-ui-for-media-stream",   // auto-grant camera permission
      "--use-fake-device-for-media-stream", // synthetic test-pattern camera
      "--window-size=1280,800",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto("http://127.0.0.1:8080", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500)); // fonts + map tiles behind splash

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: `${OUT_DIR}/${STAMP}-start-screen.png` });
  console.log("captured start screen");

  // Enter the app with the fake camera and wait for the app state to activate.
  await page.click("#btn-use-camera");
  await page.waitForSelector("body.state-app", { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000)); // map reflow + detection warm-up
  await page.screenshot({ path: `${OUT_DIR}/${STAMP}-map-view.png` });
  console.log("captured map view");

  // Camera view (Crawl/debug mode) — third key screen.
  await page.click("#btn-mode");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: `${OUT_DIR}/${STAMP}-camera-view.png` });
  console.log("captured camera view");

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
