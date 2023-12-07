const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const cookiesFilePath = 'data/cookies.json';

const app = express();
const port = 3000;

app.use(cors());
const dataDir = 'data';
const jsonFilePath = path.join(dataDir, 'table_data.json');

let jsonData = [];

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

async function scrapeData(callback = () => { console.log('Scraping Done') }) {
  try {
      const browser = await puppeteer.launch({
          headless: true,
            // args: [
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
        
    const page = await browser.newPage();
    const cookiesFileExists = await fs.access(cookiesFilePath)
    .then(() => true)
    .catch(() => false);

    if(cookiesFileExists){
        await loadCookies(page);
    }
    
    // Navigate to the login page
    await page.goto('https://vetrelief.com/admin/?page=featuredads&sub=list', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Check if login is required or you're already logged in
  const isLoginPage = await page.evaluate(() => document.querySelector('#loginP2') !== null);

  if (isLoginPage) {
    // Log in if on the login page
    await page.type("#loginP2", "upwork22");
    await page.type("#loginP", "upwork22");
    await page.click("#go > input[type=image]");

    // Wait for the login process to complete
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });

    // Save the cookies after successful login
    await saveCookies(page);
  }else{
    await saveCookies(page);
  }

    
    // Now, you are on the page where you can scrape the table data

    const tableData = await page.evaluate(() => {
      const table = document.querySelectorAll(".pad-10")[0];
      if (table) {
        const rows = Array.from(table.querySelectorAll('.row'));
        return rows.map(row => {
          const columns = Array.from(row.querySelectorAll('.active-table-element'));
        return columns.map(column => column.innerText.trim());
        });
      } else {
        return [];
      }
    //const el = document.querySelector("#main_content_Admin > div:nth-child(3) > div.text-center.txt-md.pad-10").textContent
    // console.log(el)
    // return el;
    });

    // const jsonData = tableData.length >= 1 ? [tableData[0]].concat(
    //     tableData.slice(1).map(row => [...row.slice(0, 3), Array.isArray(row[3]) ? row[3] : row[3].split('\n')])
    //   ) : [];

    const jsonData = tableData.length >= 1 ? tableData : [];

    // Save data to JSON file
    await fs.mkdir(dataDir, { recursive: true });
    jsonData.length > 1 && await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2));
    await browser.close();
    jsonData.length > 1 && callback();
    jsonData.length > 1 ? console.log('Data saved to JSON file:', jsonFilePath) : console.log('no Data Found on website');

    console.log(tableData)

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  }
}

async function scrapeDetails(id, callback = () => { console.log('Scraping Done') }) {
  try {
      const browser = await puppeteer.launch({
          headless: true,
            args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
            ],
            executablePath:
            process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath()
        });
        
    const page = await browser.newPage();
    const cookiesFileExists = await fs.access(cookiesFilePath)
    .then(() => true)
    .catch(() => false);

    if(cookiesFileExists){
        await loadCookies(page);
    }
    
    // Navigate to the login page
    await page.goto(`https://vetrelief.com/doctorlogin/?page=jobs_perm&sub=detail&id=${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Check if login is required or you're already logged in
  const isLoginPage = await page.evaluate(() => document.querySelector('#loginP2') !== null);

  if (isLoginPage) {
    // Log in if on the login page
    await page.type("#loginP2", "upwork22");
    await page.type("#loginP", "upwork22");
    await page.click("#go > input[type=image]");

    // Wait for the login process to complete
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });

    // Save the cookies after successful login
    await saveCookies(page);
  }else{
    await saveCookies(page);
  }

    
    // Now, you are on the page where you can scrape the table data

    const tableData = await page.evaluate(() => {
      const data = [
        document.querySelector("#mainContent > form > table:nth-child(6) > tbody > tr:nth-child(1) > td:nth-child(2)").textContent,
        document.querySelector("#mainContent > form > table:nth-child(6) > tbody > tr:nth-child(2) > td:nth-child(2)").textContent,
        document.querySelector("#mainContent > form > table:nth-child(23) > tbody > tr > td > img").src,
        document.querySelector("#mainContent > form > table:nth-child(23) > tbody > tr > td").textContent
      ]
        return data;
    //const el = document.querySelector("#main_content_Admin > div:nth-child(3) > div.text-center.txt-md.pad-10").textContent
    // console.log(el)
    // return el;
    });

    // const jsonData = tableData.length >= 1 ? [tableData[0]].concat(
    //     tableData.slice(1).map(row => [...row.slice(0, 3), Array.isArray(row[3]) ? row[3] : row[3].split('\n')])
    //   ) : [];

    const jsonData = tableData;

    // Save data to JSON file
    // await fs.mkdir(dataDir, { recursive: true });
    // jsonData.length > 1 && await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2));
    await browser.close();
    jsonData.length > 1 && callback(jsonData);
    jsonData.length > 1 ? console.log('Data saved to JSON file:', jsonFilePath) : console.log('no Data Found on website');

    console.log(tableData)

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
    if (req.query.id) {
      await scrapeDetails(req.query.id, async (data) => {
        // const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
        // jsonData = JSON.parse(jsonFileContent);
        res.json(data)
      });
    }else{

      //Check if the JSON file already exists
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
        } else {
          res.json(jsonData);
        }
      } else {
        console.log('JSON FILE not exist')
        await scrapeData(async () => {
          const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
          jsonData = JSON.parse(jsonFileContent);
          res.json(jsonData)
        });
      }
    }
    // scrapeData();
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});