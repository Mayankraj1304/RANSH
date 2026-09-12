const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "volleyball",
  baseUrl: "https://api.sportsapipro.com/v2/volleyball",
});
