const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.get('/scrape', async (req, res) => {
    try {
        // Record the start time
        const startTime = Date.now();

        const url = 'https://vetrelief.com/IncentiveJobs.phtml';
        const browser = await puppeteer.launch({ headless: true });

        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for some time to let the page load (you may need to adjust this depending on the page)
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Extract table data
        const tableData = await page.evaluate(() => {
            const table = document.getElementById('lookingdata');
            const rows = Array.from(table.querySelectorAll('tr'));

            return rows.map(row => {
                const columns = Array.from(row.querySelectorAll('td'));
                return columns.map(column => column.innerText.trim());
            });
        });

        // Transform the 4th column into an array
        tableData.forEach(row => {
            if (row.length > 3) {
                row[3] = row[3].split('\n');
            }
        });

        const endTime = Date.now();
        const elapsedTime = (endTime - startTime) / 1000;

        const result = tableData;

        console.log(`Time taken: ${elapsedTime} seconds`);
        res.json(result);

    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
