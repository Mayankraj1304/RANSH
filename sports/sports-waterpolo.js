const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "waterpolo",
  baseUrl: "https://api.sportsapipro.com/v2/waterpolo",
});
