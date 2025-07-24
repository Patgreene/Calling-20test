// File: /api/submit-vouch.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract data sent from the front end
    const { vouchForm, vouchSummary, vouchID } = req.body;

    // Send the data to your Make.com webhook
    const makeWebhookUrl = "https://hook.eu2.make.com/ch5r693uwg7th3pkubijrkpzyxqdvh3v";

    const makeResponse = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vouchForm,
        vouchSummary,
        vouchID,
      }),
    });

    if (!makeResponse.ok) {
      throw new Error(`Make.com responded with status ${makeResponse.status}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error submitting to Make.com:", error);
    return res.status(500).json({ error: "Failed to submit data" });
  }
}
