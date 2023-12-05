const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors'); // Add this line

const app = express();
const port = 3000;

app.use(cors());
const dataDir = 'data';
const jsonFilePath = path.join(dataDir, 'table_data.json');


let jsonData = [];

async function scrapeData(callback = ()=>{console.log('Scraping Done')}) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
    //   args: [
    //   "--disable-setuid-sandbox",
    //   "--no-sandbox",
    //   "--single-process",
    //   "--no-zygote",
    // ],
    // executablePath:
    //   process.env.NODE_ENV === "production"
    //     ? process.env.PUPPETEER_EXECUTABLE_PATH
    //     : puppeteer.executablePath()
      });
    const page = await browser.newPage();
    await page.goto('https://vetrelief.com/IncentiveJobs.phtml', { waitUntil: 'domcontentloaded' });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const tableData = await page.evaluate(() => {
      const table = document.getElementById('lookingdata');
      if (table) {        
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.map(row => {
            const columns = Array.from(row.querySelectorAll('td'));
            return columns.map(column => column.innerText.trim());
        });
      }else{
        return [];
      }
    });


    const jsonData = tableData.length>=1 ? [tableData[0]].concat(
        tableData.slice(1).map(row => [...row.slice(0, 3), Array.isArray(row[3]) ? row[3] : row[3].split('\n')])
    ):[] ;


    // Save data to JSON file
    // Create the directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });
    jsonData.length>1 && await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2));
    await browser.close();
    jsonData.length>1 && callback();
    jsonData.length>1 ? console.log('Data saved to JSON file:', jsonFilePath):console.log('no Data Found on website');

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
      console.log('FILE data/table_date.json exist')
      // Read the existing JSON file
      const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
      jsonData = JSON.parse(jsonFileContent);
      console.log('Data loaded from existing JSON file:', jsonFilePath);
      if (await isFileModifiedRecently('./data/table_data.json', 5)) {
        res.json(jsonData);
        await scrapeData();
      }else{
        res.json(jsonData);
      }
    } else {
      console.log('JSON FILE not exist')
      await scrapeData(async()=>{
        const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
        jsonData = JSON.parse(jsonFileContent);
        res.json(jsonData)
      });
    }

    // Respond immediately with the current data
    //res.json(jsonData);

  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});