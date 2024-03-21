const puppeteer = require('puppeteer');
const findChrome = require('chrome-finder');

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        // defaultViewport: null,
        executablePath: findChrome(),
    });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5123/');
}

run().catch(console.error);