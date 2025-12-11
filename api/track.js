import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  const awb = req.query.awb;

  if (!awb) {
    return res.status(400).json({ error: "AWB is missing" });
  }

  try {
    const executablePath = await chromium.executablePath;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.goto(
      `https://trackcourier.io/track-and-trace/safexpress-courier/${awb}`,
      { waitUntil: "networkidle2" }
    );

    await page.waitForSelector(".modern-status-badge", { timeout: 15000 });

    const status = await page.$eval(
      ".modern-status-badge",
      (el) => el.innerText.trim()
    );

    await browser.close();

    let finalStatus = "In-transit";
    let template = "agro_in_transit_1";

    if (status.toUpperCase().includes("DELIVERED")) {
      finalStatus = "Delivered";
      template = "deliverd_1_agro";
    } else if (
      status.toUpperCase().includes("OUT FOR DELIVERY") ||
      status.toUpperCase().includes("ARRIVED")
    ) {
      finalStatus = "Arrived at destination";
      template = "out_for_delivery_12";
    }

    return res.json({
      Status: "Success",
      awb,
      finalStatus,
      template,
      sourceStatus: status,
    });
  } catch (err) {
    return res.json({ error: err.toString() });
  }
}
