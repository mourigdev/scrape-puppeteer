const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

const jsonFilePath = path.join(__dirname, 'data', 'table_data.json');
let jsonData = [];

// Check if the JSON file already exists
const jsonFileExistsPromise = fs.access(jsonFilePath)
  .then(() => true)
  .catch(() => false);

async function scrapeData() {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://vetrelief.com/IncentiveJobs.phtml', { waitUntil: 'domcontentloaded' });

    // Your scraping logic here...
    // Update jsonData with the scraped data

    await browser.close();

    // Save the scraped data to the JSON file
    await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log('Data saved to JSON file:', jsonFilePath);

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  }
}

app.get('/scrape', async (req, res) => {
  try {
    const jsonFileExists = await jsonFileExistsPromise;

    if (jsonFileExists) {
      // Read the existing JSON file
      const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
      jsonData = JSON.parse(jsonFileContent);
      console.log('Data loaded from existing JSON file:', jsonFilePath);
    }

    // Perform scraping asynchronously
    scrapeData();

    // Respond immediately with the current data
    return res.json(jsonData);

  } catch (error) {
    console.error('An error occurred:', error);
    return res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
