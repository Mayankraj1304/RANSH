const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "badminton",
  baseUrl: "https://api.sportsapipro.com/v2/badminton",
  participantKeys: ["player1", "player2"],
});
