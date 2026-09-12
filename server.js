const app = require("./app");

const port = process.env.PORT || 3001;
const tournamentUrls = [
  "/api/cricket/tournaments",
  "/api/badminton/tournaments",
  "/api/basketball/tournaments",
  "/api/beach-volley/tournaments",
  "/api/cycling/tournaments",
  "/api/football/tournaments",
  "/api/handball/tournaments",
  "/api/rugby/tournaments",
  "/api/table-tennis/tournaments",
  "/api/volleyball/tournaments",
  "/api/waterpolo/tournaments",
];

app.listen(port, () => {
  console.log(`Sports API server running on http://localhost:${port}`);
  console.log("Tournament endpoints:");
  tournamentUrls.forEach((path) => {
    console.log(`http://localhost:${port}${path}`);
  });
});
