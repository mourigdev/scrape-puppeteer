const express = require('express');
const puppeteer = require('puppeteer');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const cookiesFilePath = 'data/cookies.json';

const app = express();
const port = 3000;

app.use(cors());
const dataDir = 'data';
const jsonFilePath = path.join(dataDir, 'table_data.json');

let browser;
let jsonData = [];

async function initializeBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: true,
            //     args: [
      // "--disable-setuid-sandbox",
      // "--no-sandbox",
      // "--single-process",
      // "--no-zygote",
      // ],
      // executablePath:
      // process.env.NODE_ENV === "production"
      //     ? process.env.PUPPETEER_EXECUTABLE_PATH
      //     : puppeteer.executablePath()
    });
  } catch (error) {
    console.error('Error initializing browser:', error);
    // Handle the error as needed, e.g., throw an exception or take appropriate action.
  }
}



async function saveCookies(page) {
  const cookies = await page.cookies();
  await fs.writeFile(cookiesFilePath, JSON.stringify(cookies, null, 2));
}

async function loadCookies(page) {
  try {
    const cookiesString = await fs.readFile(cookiesFilePath, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
  } catch (error) {
    console.error('Error reading cookies file:', error);
  }
}

async function scrapeData(callback = () => {
  console.log('Scraping Done');
}) {
  try {
    const page = await browser.newPage();
    await loadCookies(page);

    await page.goto('https://vetrelief.com/admin/?page=featuredads&sub=list', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const isLoginPage = await page.evaluate(
      () => document.querySelector('#loginP2') !== null
    );

    if (isLoginPage) {
      await page.type("#loginP2", "upwork22");
      await page.type("#loginP", "upwork22");
      await page.click("#go > input[type=image]");
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await saveCookies(page);
    } else {
      await saveCookies(page);
    }

    const tableData = await page.evaluate(() => {
      const table = document.querySelectorAll('.pad-10')[0];
      if (table) {
        const rows = Array.from(table.querySelectorAll('.row'));
        return rows.map(row =>
          Array.from(row.querySelectorAll('.active-table-element')).map(column =>
            column.innerText.trim()
          )
        );
      } else {
        return [];
      }
    });

    jsonData = tableData;
    await fs.mkdir(dataDir, { recursive: true });
    jsonData.length > 1 && (await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2)));

    await page.close(); // Close the tab after scraping

    jsonData.length > 1 && callback();
    jsonData.length > 1
      ? console.log('Data saved to JSON file:', jsonFilePath)
      : console.log('No data found on the website');
    console.log(tableData);
  } catch (error) {
    console.error('An error occurred during scraping:', error);
  }
}

async function scrapeDetails(id, res, callback = () => {
  console.log('Scraping Done');
}) {
  try {
    const filePath = path.join(dataDir, `${id}.json`);
    const fileExists = await fs.access(filePath).then(
      () => true,
      () => false
    );

    if (fileExists) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonDataFromFile = JSON.parse(fileContent);
      res.json(jsonDataFromFile);
      return;
    }

    const page = await browser.newPage();
    await loadCookies(page);

    await page.goto(`https://vetrelief.com/doctorlogin/?page=jobs_perm&sub=detail&id=${id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const isLoginPage = await page.evaluate(
      () => document.querySelector('#loginP2') !== null
    );

    if (isLoginPage) {
      await page.type("#loginP2", "upwork22");
      await page.type("#loginP", "upwork22");
      await page.click("#go > input[type=image]");
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await saveCookies(page);
    } else {
      await saveCookies(page);
    }

    const tableData = await page.evaluate(() => {
      const tdElement = document.querySelectorAll('td[align="center"]')[1];
      var textArray;
      if (tdElement) {
        // Get the innerHTML of the td element and split it into an array
        textArray = tdElement.innerHTML.split('<br>');
    
        // Replace "&nbsp;" with a regular space and trim each element in the array
        textArray = textArray.map(function (text) {
            return text.replace(/&nbsp;/g, ' ').trim();
        });
    
        // Filter out empty strings from the array
        textArray = textArray.filter(function (text) {
            return text !== '';
        });
    
        // Log the resulting array to the console
        console.log(textArray);
    } else {
        console.log('No matching td element found.');
    }
      return [
        document.querySelector("#mainContent > form > table:nth-child(6) > tbody > tr:nth-child(1) > td:nth-child(2)")?.textContent || '',
        document.querySelector("#mainContent > form > table:nth-child(6) > tbody > tr:nth-child(2) > td:nth-child(2)")?.textContent || '',
        document.querySelector("td[bgcolor='#ddddff'] > img")?.src || '',
        document.querySelector('td[bgcolor="#ddddff"]:not([align])')?.textContent || '',
        document.querySelector('td[align="center"]').textContent === 'Practice Type:' ? textArray : []
      ];
    });

    jsonData = tableData;

    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));

    jsonData.length > 1 && callback(jsonData);
    jsonData.length > 1
      ? console.log(`Data saved to JSON file: ${filePath}`)
      : console.log('No data found on the website');
    console.log(tableData);
    await page.close(); // Close the tab after scraping
  } catch (error) {
    console.error('An error occurred during scraping:', error);
    res.status(500).send('Internal Server Error');
  }
}

async function isFileModifiedRecently(filePath, thresholdInMinutes) {
  try {
    const stats = await fs.stat(filePath);
    const lastModifiedTime = stats.mtime;
    const currentTime = new Date();
    const timeDifferenceInMinutes = (currentTime - lastModifiedTime) / (1000 * 60);
    const isModifiedRecently = timeDifferenceInMinutes > thresholdInMinutes;
    console.log(isModifiedRecently, timeDifferenceInMinutes);
    return isModifiedRecently;
  } catch (error) {
    console.error('Error getting file information:', error);
    throw error; // Propagate the error
  }
}

app.get('/scrape', async (req, res) => {
  try {
    if (!browser) {
      await initializeBrowser();
    }

    if (req.query.id) {
      await scrapeDetails(req.query.id, res, async (data) => {
        const filePath = path.join(dataDir, `${req.query.id}.json`);
        const fileExists = await fs.access(filePath).then(
      () => true,
      () => false
    );

    if (fileExists) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonDataFromFile = JSON.parse(fileContent);
      res.json(jsonDataFromFile);
      return;
    }
        // res.json(data);
      });
    } else {
      const jsonFileExists = await fs.access(jsonFilePath).then(
        () => true,
        () => false
      );

      if (jsonFileExists) {
        console.log('FILE data/table_date.json exists');
        const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
        jsonData = JSON.parse(jsonFileContent);

        if (await isFileModifiedRecently('./data/table_data.json', 5)) {
          res.json(jsonData);
          await scrapeData();
        } else {
          res.json(jsonData);
        }
      } else {
        console.log('JSON FILE does not exist');
        await scrapeData(async () => {
          const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
          jsonData = JSON.parse(jsonFileContent);
          res.json(jsonData);
        });
      }
    }
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
