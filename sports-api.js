const fetch = require("node-fetch");

function createSportsApi({
  slug,
  baseUrl,
  participantKeys = ["competitor1", "competitor2"],
}) {
  const apiKey = process.env.SPORTSAPIPRO_KEY;
  const cache = new Map();
  const cacheTtlMs = 3 * 60 * 60 * 1000;

  if (!apiKey) {
    console.warn(
      "WARNING: SPORTSAPIPRO_KEY is not set. Add it to your .env file.",
    );
  }

  async function cachedFetch(cacheKey, url) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      return cached.data;
    }

    const response = await fetch(url, { headers: { "x-api-key": apiKey } });
    const remaining = response.headers.get("x-ratelimit-remaining");
    const limit = response.headers.get("x-ratelimit-limit");
    if (remaining !== null) {
      console.log(
        `SportsAPI Pro quota: ${remaining}/${limit} requests remaining today.`,
      );
    }

    if (response.status === 429) {
      throw new Error("Daily quota exceeded (429). Resets at midnight UTC.");
    }
    if (!response.ok) {
      throw new Error(
        `SportsAPI Pro request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    if (data.success === false) {
      throw new Error(
        `SportsAPI Pro returned an error: ${JSON.stringify(data.error || data)}`,
      );
    }

    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  async function getTournaments() {
    const date = new Date().toISOString().split("T")[0];
    const scheduledData = await cachedFetch(
      `tournaments-${date}`,
      `${baseUrl}/api/scheduled-tournaments/${date}`,
    );
    let leagues = [];

    try {
      const leaguesData = await cachedFetch(
        "leagues",
        `${baseUrl}/api/leagues`,
      );
      leagues =
        leaguesData.leagues ||
        leaguesData.tournaments ||
        leaguesData.data ||
        [];
    } catch (error) {
      if (!error.message.includes("404")) {
        throw error;
      }

      const v1BaseUrl = baseUrl.replace("/v2/", "/v1/");
      try {
        const competitionsData = await cachedFetch(
          "competitions",
          `${v1BaseUrl}/competitions`,
        );
        leagues =
          competitionsData.data?.competitions ||
          competitionsData.competitions ||
          [];
      } catch (fallbackError) {
        if (!fallbackError.message.includes("404")) {
          throw fallbackError;
        }
      }
    }

    if (!leagues.length) {
      const scheduleData = await cachedFetch(
        `schedule-${date}`,
        `${baseUrl}/api/schedule/${date}`,
      );
      leagues = (scheduleData.events || scheduleData.data || [])
        .flatMap((event) => [
          event.tournament,
          event.tournament?.uniqueTournament,
        ])
        .filter((tournament) => tournament?.id);
    }

    const leaguesById = new Map(leagues.map((league) => [league.id, league]));

    return {
      date,
      tournaments: (
        scheduledData.tournaments ||
        scheduledData.events ||
        scheduledData.data ||
        []
      ).map((tournament) => {
        const tournamentId =
          typeof tournament === "object" ? tournament.id : tournament;
        const league = leaguesById.get(tournamentId);

        if (league) {
          return league;
        }

        return typeof tournament === "object"
          ? {
              id: tournament.id,
              name: tournament.name || tournament.tournament?.name,
              category: tournament.category?.name,
            }
          : { id: tournamentId };
      }),
    };
  }

  async function getUpcomingMatches(date) {
    const matchDate = date || new Date().toISOString().split("T")[0];
    const data = await cachedFetch(
      `schedule-${matchDate}`,
      `${baseUrl}/api/schedule/${matchDate}`,
    );
    const matches = (data.events || data.data || [])
      .filter(
        (event) =>
          event.status?.type !== "finished" && event.status?.code !== 100,
      )
      .map((event) => ({
        id: event.id,
        tournament: event.tournament?.name,
        [participantKeys[0]]: event.homeTeam?.name,
        [participantKeys[1]]: event.awayTeam?.name,
        startTime: event.startTimestamp
          ? new Date(event.startTimestamp * 1000).toISOString()
          : null,
        status: event.status?.description,
      }))
      .sort(
        (left, right) => new Date(left.startTime) - new Date(right.startTime),
      );

    return { date: matchDate, matches };
  }

  async function getRawSchedule(date) {
    const matchDate = date || new Date().toISOString().split("T")[0];
    const response = await fetch(`${baseUrl}/api/schedule/${matchDate}`, {
      headers: { "x-api-key": apiKey },
    });
    return response.json();
  }

  return {
    slug,
    getTournaments,
    getUpcomingMatches,
    getRawSchedule,
    health: () => ({ status: "ok", cachedKeys: Array.from(cache.keys()) }),
  };
}

function createCricketApi() {
  const fetcher = require("node-fetch");
  const apiKey = process.env.CRICAPI_KEY;
  const cache = new Map();
  const cacheTtlMs = 12 * 60 * 60 * 1000;

  async function getTournaments() {
    const cached = cache.get("series");
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      return { tournaments: cached.data };
    }

    const response = await fetcher(
      `https://api.cricapi.com/v1/series?apikey=${apiKey}&offset=0`,
    );
    if (!response.ok) {
      throw new Error(
        `CricAPI request failed: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(
        `CricAPI returned an error: ${data.status} - ${data.reason || "unknown reason"}`,
      );
    }

    const tournaments = (data.data || []).map((series) => ({
      id: series.id,
      name: series.name,
      startDate: series.startDate,
      endDate: series.endDate,
      matchCount: series.matches,
      odi: series.odi,
      t20: series.t20,
      test: series.test,
    }));
    cache.set("series", { data: tournaments, timestamp: Date.now() });
    return { tournaments };
  }

  return {
    slug: "cricket",
    getTournaments,
    health: () => ({ status: "ok", cachedKeys: Array.from(cache.keys()) }),
  };
}

module.exports = { createSportsApi, createCricketApi };
