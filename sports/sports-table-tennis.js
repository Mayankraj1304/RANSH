const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "table-tennis",
  baseUrl: "https://api.sportsapipro.com/v2/table-tennis",
});
