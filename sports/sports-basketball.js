const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "basketball",
  baseUrl: "https://api.sportsapipro.com/v2/basketball",
});
