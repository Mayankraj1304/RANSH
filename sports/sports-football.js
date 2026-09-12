const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "football",
  baseUrl: "https://api.sportsapipro.com/v2/football",
});
