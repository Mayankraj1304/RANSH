const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "handball",
  baseUrl: "https://api.sportsapipro.com/v2/handball",
});
