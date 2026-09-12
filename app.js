require("dotenv").config();
const express = require("express");
const path = require("path");

const sports = [
  require("./sports/sports-cricket"),
  require("./sports/sports-badminton"),
  require("./sports/sports-basketball"),
  require("./sports/sports-beach-volley"),
  require("./sports/sports-cycling"),
  require("./sports/sports-football"),
  require("./sports/sports-handball"),
  require("./sports/sports-rugby"),
  require("./sports/sports-table-tennis"),
  require("./sports/sports-volleyball"),
  require("./sports/sports-waterpolo"),
];

const app = express();

app.use(express.static(path.join(__dirname, "FRONTEND")));

app.get("/api/sports", (req, res) => {
  res.json({
    sports: sports.map((sport) => ({
      slug: sport.slug,
      hasMatches: typeof sport.getUpcomingMatches === "function",
    })),
  });
});

for (const sport of sports) {
  const basePath = sport.slug === "cricket" ? "/api" : `/api/${sport.slug}`;
  const tournamentPaths =
    sport.slug === "cricket"
      ? ["/api/tournaments", "/api/cricket/tournaments"]
      : [`${basePath}/tournaments`];

  app.get(tournamentPaths, async (req, res) => {
    try {
      const result = await sport.getTournaments();
      res.json({
        ...(result.date ? { date: result.date } : {}),
        count: result.tournaments.length,
        tournaments: result.tournaments,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to fetch tournaments", details: error.message });
    }
  });

  if (sport.getUpcomingMatches) {
    app.get(`${basePath}/upcoming-matches`, async (req, res) => {
      try {
        const result = await sport.getUpcomingMatches(req.query.date);
        res.json({
          date: result.date,
          count: result.matches.length,
          matches: result.matches,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          error: "Failed to fetch upcoming matches",
          details: error.message,
        });
      }
    });

    app.get(`${basePath}/debug/raw-schedule`, async (req, res) => {
      try {
        res.json(await sport.getRawSchedule(req.query.date));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  app.get(`${basePath}/health`, (req, res) => {
    res.json(sport.health());
  });
}

module.exports = app;
