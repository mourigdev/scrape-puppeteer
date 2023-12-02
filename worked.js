const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;


const jsonFilePath = path.join(__dirname, 'data', 'table_data.json');
let jsonData = [];

async function scrapeData() {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://vetrelief.com/IncentiveJobs.phtml', { waitUntil: 'domcontentloaded' });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const tableData = await page.evaluate(() => {
        const table = document.getElementById('lookingdata');
        const rows = Array.from(table.querySelectorAll('tr'));

        return rows.map(row => {
            const columns = Array.from(row.querySelectorAll('td'));
            return columns.map(column => column.innerText.trim());
        });
    });

    const jsonData = [tableData[0]].concat(
        tableData.slice(1).map(row => [...row.slice(0, 3), Array.isArray(row[3]) ? row[3] : row[3].split('\n')])
    );

    // Save data to JSON file
    await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2));

    await browser.close();

    console.log('Data saved to JSON file:', jsonFilePath);

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  }
}

async function isFileModifiedRecently(filePath, thresholdInMinutes) {
  try {
    const stats = await fs.stat(filePath);
    const lastModifiedTime = stats.mtime; // Modification time
    const currentTime = new Date();

    // Calculate the time difference in minutes
    const timeDifferenceInMinutes = (currentTime - lastModifiedTime) / (1000 * 60);

    // Check if the file has been modified within the threshold
    const isModifiedRecently = timeDifferenceInMinutes > thresholdInMinutes;
    console.log(isModifiedRecently, timeDifferenceInMinutes);
    return isModifiedRecently;
  } catch (error) {
    console.error('Error getting file information:', error);
  }
}

app.get('/scrape', async (req, res) => {
  try {
    // Check if the JSON file already exists
    const jsonFileExists = await fs.access(jsonFilePath)
      .then(() => true)
      .catch(() => false);

    if (jsonFileExists) {
      // Read the existing JSON file
      const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
      jsonData = JSON.parse(jsonFileContent);
      console.log('Data loaded from existing JSON file:', jsonFilePath);
      if (await isFileModifiedRecently('./data/table_data.json', 5)) {
        await scrapeData();
      }
    } else {
      await scrapeData();
    }

    // Respond immediately with the current data
    res.json(jsonData);

  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
