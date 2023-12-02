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

        const htmlContent = await page.content();

        // Extract table data
        const tableData = await page.evaluate(() => {
            const table = document.getElementById('lookingdata');
            const rows = Array.from(table.querySelectorAll('tr'));

            return rows.map(row => {
                const columns = Array.from(row.querySelectorAll('td'));
                return columns.map(column => column.innerText.trim());
            });
        });

        // Write table data to a CSV file
        const csvData = [tableData[0].join(',')].concat(tableData.slice(1).map(row => row.join(',')));
        const fileName = `table_data_${Date.now()}.csv`;

        // Specify the file path on the server where you want to save the CSV file
        const filePath = path.join(__dirname, 'data', fileName);

        fs.writeFileSync(filePath, csvData.join('\n'));

        const endTime = Date.now();
        const elapsedTime = (endTime - startTime) / 1000;

        console.log(`Data has been successfully extracted and saved to ${filePath}`);
        console.log(`Time taken: ${elapsedTime} seconds`);

        res.status(200).send('Data has been successfully saved on the server.');

    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
