async function getText(file) {
    let x = await fetch(file);
    let y = await x.text();
    console.log(y);
  }

  getText("https://table-data.onrender.com/scrape")