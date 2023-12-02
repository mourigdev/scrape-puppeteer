const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs').promises; // Use fs.promises for async file operations
const path = require('path');

const app = express();
const port = 3000;

const jsonFilePath = path.join(__dirname, 'data', 'table_data.json');

app.get('/scrape', async (req, res) => {
    try {
        let jsonData;

        // Check if the JSON file exists
        try {
            const existingData = await fs.readFile(jsonFilePath, 'utf-8');
            jsonData = JSON.parse(existingData);
            console.log('Returning data from existing JSON file.');
        } catch (err) {
            // File doesn't exist or error reading it
            console.log('JSON file not found. Initiating scraping process.');
            jsonData = await scrapeAndSave();
        }

        res.status(200).json(jsonData);

    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Internal Server Error');
    }
});

async function scrapeAndSave() {
    const startTime = Date.now();
    const url = 'https://vetrelief.com/IncentiveJobs.phtml';
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });
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

    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000;

    console.log(`Data has been successfully scraped and saved to ${jsonFilePath}`);
    console.log(`Time taken: ${elapsedTime} seconds`);

    return jsonData;
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
