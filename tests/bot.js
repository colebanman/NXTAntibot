const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    });
    const page = await browser.newPage();
    
    await page.goto('https://www.example.com');
}

run().catch(console.error);