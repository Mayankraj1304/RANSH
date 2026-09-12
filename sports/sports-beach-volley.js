const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "beach-volley",
  baseUrl: "https://api.sportsapipro.com/v2/beach-volley",
});
