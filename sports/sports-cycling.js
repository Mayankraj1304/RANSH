const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "cycling",
  baseUrl: "https://api.sportsapipro.com/v2/cycling",
});
