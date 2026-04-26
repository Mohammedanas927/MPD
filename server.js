const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_URL = "https://anasm3u8.mohammedanas18745.workers.dev/index.m3u8";

// Store active FFmpeg process
let ffmpeg = null;

app.get("/start", (req, res) => {
  if (ffmpeg) return res.send("Already running");

  console.log("Starting real-time DASH...");

  ffmpeg = spawn("ffmpeg", [
    "-i", STREAM_URL,
    "-map", "0:v",
    "-map", "0:a?",
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "dash",
    "-window_size", "5",
    "-extra_window_size", "5",
    "-remove_at_exit", "1",
    "-seg_duration", "4",
    "-use_template", "1",
    "-use_timeline", "1",
    "pipe:1" // output to memory
  ]);

  ffmpeg.stderr.on("data", d => console.log(d.toString()));

  res.send("DASH started");
});

// MPD endpoint (dynamic)
app.get("/manifest.mpd", (req, res) => {
  const mpd = `<?xml version="1.0"?>
<MPD type="dynamic"
 minimumUpdatePeriod="PT2S"
 minBufferTime="PT2S"
 profiles="urn:mpeg:dash:profile:isoff-live:2011">

  <Period>
    <AdaptationSet mimeType="video/mp4">
      <Representation id="1" bandwidth="1000000">
        <BaseURL>/segment/</BaseURL>
        <SegmentTemplate 
          media="$Number$.m4s"
          initialization="init.mp4"
          startNumber="1"
          duration="4"/>
      </Representation>
    </AdaptationSet>
  </Period>

</MPD>`;

  res.setHeader("Content-Type", "application/dash+xml");
  res.send(mpd);
});

// Fake segment endpoint (proxy TS → fMP4 style)
app.get("/segment/:num.m4s", async (req, res) => {
  const num = req.params.num;

  // In real system, you'd map this to live TS chunk
  const tsUrl = `${STREAM_URL}`;

  const response = await fetch(tsUrl);
  res.setHeader("Content-Type", "video/mp4");
  response.body.pipe(res);
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
