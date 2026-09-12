const { createSportsApi } = require("../sports-api");

module.exports = createSportsApi({
  slug: "rugby",
  baseUrl: "https://api.sportsapipro.com/v2/rugby",
});
