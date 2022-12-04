const express = require("express");
const app = express();
const playwright = require("playwright");
const cors = require("cors");

const startBrowser = async () => {
  const browser = await playwright.chromium.launchPersistentContext(
    "/tmp/playwright",
    { headless: false }
  );

  const page = await browser.newPage();
  await page.goto("https://chat.openai.com/");

  const isLoggedIn = () => {
    try {
      return (
        page
          .$$('div[class*="PromptTextarea__TextareaWrapper"]')
          .$$("textarea") !== null
      );
    } catch (error) {
      return false;
    }
  };

  if (!isLoggedIn()) {
    console.log("Please log in to OpenAI Chat.");
    console.log("Press enter when you are done.");
    // await new Promise((resolve) => process.stdin.once("data", resolve));
  } else {
    console.log("Logged in.");
  }

  const getInputBox = () =>
    page.$('div[class*="PromptTextarea__TextareaWrapper"] textarea');

  const sendMessage = async (message) => {
    const box = await getInputBox();
    await box.click();
    await box.fill(message);
    await box.press("Enter");
  };

  const getLastMessage = async () => {
    try {
      await page.waitForSelector(".result-streaming", {
        state: "detached",
        timeout: 0,
      });
      const pageElements = await page.$$(
        'div[class*="markdown prose dark:prose-invert break-words light"]'
      );
      if (pageElements.length > 0) {
        const lastMessage = pageElements[pageElements.length - 1];
        return await lastMessage.innerHTML();
      }
    } catch (error) {
      return error.message;
    }
  };

  app.use(cors());

  app.get("/api/chat", async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) {
      return res.status(400).send("Please provide a prompt.");
    }
    console.log(`Sending message: ${prompt}`);
    await sendMessage(prompt);
    const gptResponse = await getLastMessage();
    console.log(`Response: ${gptResponse}`);
    res.send(gptResponse);
  });

  app.listen(5001, () => {
    console.log("Listening on port 5001...");
  });

  // index.html
  app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
  });

  // error handler
  app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });
};

startBrowser();
