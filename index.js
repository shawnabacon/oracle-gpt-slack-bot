import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/slack/events", async (req, res) => {
  const { type, event } = req.body;

  // Slack URL verification step
  if (type === "url_verification") {
    return res.send({ challenge: req.body.challenge });
  }

  // Only handle messages (not bot's own)
  if (event && event.type === "app_mention" && !event.bot_id) {
    try {
      // Send user’s message to your custom GPT
      const completion = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4.1", // or your custom GPT model slug
          messages: [{ role: "user", content: event.text }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const reply = completion.data.choices[0].message.content;

      // Send reply back to Slack
      await axios.post(
        "https://slack.com/api/chat.postMessage",
        {
          channel: event.channel,
          thread_ts: event.ts, // reply in a thread
          text: reply,
        },
        {
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.status(200).send();
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send();
    }
  } else {
    res.status(200).send();
  }
});

app.listen(3000, () => console.log("✅ Slack GPT bridge running on port 3000"));
