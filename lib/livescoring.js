// jshint esversion:8

const axios = require("axios");
const mongo = require("./cflmongo");
const fs = require('fs-extra');
const cflapi = require("./cflapi");
const {
  currentWeek,
  nflteams
} = require('./general');
const year = '2021';
const _ = require('lodash');
const socket = require('./socket');

let cflteams;

const positions = {
  QB: 2,
  RB: 3,
  WR: 3,
  K: 1,
  DEF: 1
};

function convert(num) {
  return parseInt(num) || 0;
}

function getDefScore(s) {
  let score = 15;

  let points = convert(s[54]);

  if (points > 0) score -= 10;
  if (points > 10) score -= 2;
  if (points > 20) score -= 3;
  if (points > 30) score -= 5;

  score += convert(s[50]) * 6;
  score += convert(s[49]) * 6;
  score += convert(s[46]) * 3;

  return score;
}

function passingYards(num) {
  let score = 0;

  if (num >= 100) score += 5;
  if (num >= 150) score += 2;
  if (num >= 200) score += 3;
  if (num >= 250) score += 3;
  if (num >= 300) score += 3;
  if (num >= 350) score += 4;
  if (num >= 400) {
    score += 6;
    score += Math.floor((num - 400) / 10);
  }

  return score;
}

function rushingYards(num) {
  let score = 0;

  if (num >= 25) score += 5;
  if (num >= 50) score += 2;
  if (num >= 75) score += 2;
  if (num >= 100) score += 3;
  if (num >= 130) score += 3;
  if (num >= 160) score += 5;
  if (num >= 200) {
    score += 8;
    score += Math.floor((num - 200) / 10);
  }

  return score;
}

function receivingYards(num) {
  let score = 0;

  if (num >= 25) score += 5;
  if (num >= 50) score += 3;
  if (num >= 100) score += 4;
  if (num >= 130) score += 3;
  if (num >= 160) score += 3;
  if (num >= 200) score += 3;
  if (num >= 230) score += 4;
  if (num >= 250) score += Math.floor((num - 250) / 10);

  return score;
}

function getScore(s) {
  let score = 0;

  score += passingYards(convert(s[5]));
  score += convert(s[6]) * 6;
  score += convert(s[7]) * (0 - 2);

  score += rushingYards(convert(s[14]));
  score += convert(s[15]) * 8;
  score += convert(s[16]) * 6;

  score += receivingYards(convert(s[21]));
  score += convert(s[22]) * 8;
  score += convert(s[24]) * 6;

  score += convert(s[28]) * 20;

  score += convert(s[32]) * 2;

  score += convert(s[33]);

  score += convert(s[40]) * 3;
  score += convert(s[38]);
  score += convert(s[39]) * 2;
  return score;
}

async function init() {
  console.log('starting live scoring');
  cflteams = await cflapi.cflteams();
  console.log(cflteams);
  setTimeout(getStats, 2000);
}

async function CFLSocketData() {
  const week = currentWeek();
  const query = { week };
  await mongo.find('cflschedule', { query })
    .then(res => {
      console.log('SCHEDULE', res);
      const socketData = _.map(res, x => {
        return {
          id: x._id,
          data: {
            team1: x.team1,
            team2: x.team2,
          }
        }
      });
      console.log('WTF', socketData);
      socket.emit('cflschedule', socketData);
      setTimeout(getStats, 5000);
    })
}

async function teamScore(index = 0) {
  if (index >= cflteams.length) {
    console.log("ALL DONE");
    CFLSocketData();
    return;
  }
  let team = cflteams[index];
  let tm = team.team_name;
  let id = team._id;
  let week = currentWeek();
  let query = {};
  query[`weeks.${week-1}.cflteam`] = parseInt(id);
  let sort = {};
  sort[`weeks.${week-1}.score`] = -1;
  let fields = {
    position: 1,
    weeks: 1,
    _id: 0
  };
  await mongo
    .find("players", {
      query,
      sort,
      fields
    })
    .then(res => {
      let ret = [];
      let score = 0;
      let tiebreaker = 0;
      Object.keys(positions).forEach(p => {
        ret[p] = [];
      });
      res.forEach(plr => {
        if (plr.weeks[week-1].IR) return;
        if (ret[plr.position].length >= positions[plr.position]) return;
        if (!ret[plr.position].length) tiebreaker += plr.weeks[week-1].score;
        score += plr.weeks[week-1].score;
        ret[plr.position].push(plr);
      });
      console.log(tm, score, tiebreaker);
      mongo.update("cflschedule", {
        query: {
          week,
          'team1.id': parseInt(id)
        },
        set: {
          'team1.score': score,
          'team1.tiebreaker': tiebreaker
        }
      });
      mongo.update("cflschedule", {
        query: {
          week,
          'team2.id': parseInt(id)
        },
        set: {
          'team2.score': score,
          'team2.tiebreaker': tiebreaker
        }
      });
      teamScore(++index);
    });
}

async function updateGames(games) {
  const week = currentWeek();
  const socketData = [];
  console.log('updating games', week);
  _.each(Object.keys(games), _id => {
    const game = games[_id];
    const final = game.gameClock === "Final";
    const started = (game.gameStatus !== "pre_game");
    if (!started) return;
    const status = game.gameStatus;
    const clock = game.gameClock;
    const homeScore = game.homeTeam.score;
    const awayScore = game.awayTeam.score;
    const query = { _id };
    const set = { status, clock, 'home.score': homeScore, 'away.score': awayScore }
    mongo.update('nflschedule', { query, set });
    socketData.push(
      {
        id: _id,
        data: {
          status,
          clock,
          homeScore,
          awayScore
        }
      }
    )
  });
  socket.emit('nflschedule', socketData);
}

let playerSocketData = [];

function getStats() {
  let week = currentWeek();
  const url = `https://api.fantasy.nfl.com/v2/players/weekstats?season=${year}&week=${week}`;
  playerSocketData = [];
  axios
    .get(url)
    .then(res => {
      updateGames(Object.values(res.data.nflGames));
      let players = res.data.games[102020].players;
      console.log(!players);
      if (!players) {
        setTimeout(getStats, 5000);
        return;
      }
      Object.keys(players).forEach(_id => {
        mongo
          .find("players", {
            query: {
              _id
            },
            fields: {
              position: 1
            }
          })
          .then(res => {
            if (!res.length) return; //console.log('bad -id', _id);
            let stats = players[_id].stats.week[year][week];
            let score =
              res[0].position === "DEF" ?
              getDefScore(stats) :
              getScore(stats);
            let set = {};
            set[`weeks.${week-1}.score`] = score;
            set[`weeks.${week-1}.stats`] = stats;
            mongo.update("players", {
              query: {
                _id
              },
              set
            });
            playerSocketData.push({
              id: _id,
              week,
              data: {
                score,
                stats
              }
            })
            const d = {
              id: _id,
              week,
              data: {
                score,
                stats
              }
            }
            socket.emit('player-stats', [d]);
          });
      });
      teamScore();
      //setTimeout(getStats, 10000);
    })
    .catch(err => {
      console.log("ERR", err);
    });
}

/*
function checkTime() {
  checkTeams();
  let d = new Date();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  if (hours === 11 && minutes >= 3) {
    init();
    checkTeams();
  } else setTimeout(checkTime, 5000);
}

function checkTeams() {
  let teams = ["SEA", "SF"]; //["NYJ", "BUF", "CLE", "CIN", "GB", "DET", "LAC", "KC", "CHI", "MIN", "MIA", "NE", "ATL", "TB", "NO", "CAR"]; //["NE", "CIN", "TB", "DET", "CHI", "GB", "HOU", "TEN", "DEN", "KC", "MIA", "NYG", "PHI", "WAS", "WSH", "SEA", "CAR"];
  //*
  let d = new Date();
  let hours = d.getHours();
  if (hours >= 14 && d.getMinutes() >= 25)
    teams.push(
      "WAS",
      "WSH",
      "OAK",
      "DEN",
      "AZ",
      "ARI",
      "LA",
      "DAL",
      "PHI",
      "NYG",
      "IND",
      "JAX",
      "PIT",
      "BAL",
      "TEN",
      "HOU"
    );
  if (d.getHours() >= 18 && d.getMinutes() >= 20) teams.push("SEA", "SF");

  let query = {
    "weeks.16.nflteam": {
      $in: teams
    }
  };
  let set = {
    "weeks.16.gameStatus": "S"
  };
  mongo.updateMany("players", {
    query,
    set
  });
}
  // */

//*

function fixKickers() {
  let query = {
    position: "K",
    score: {}
  };
  query.score['$gt'] = 0;
  console.log('fix kickers', query);
  mongo.find('players', {
    query
  }).then(res => {
    fs.writeFileSync('data/kickers.json', JSON.stringify(res, null, 2));
    res.forEach(kicker => {
      let fg = 0;
      const query = {
        _id: kicker._id
      };
      kicker.weeks.forEach((week, index) => {
        if (!week.stats) return;
        let stats = week.stats;
        stats[40] = (convert(stats[35]) + convert(stats[36]) + convert(stats[37]) + convert(stats[38]) + convert(stats[39])).toString();
        fg += convert(stats[40]);
        let set = {};
        set[`weeks.${index}.stats`] = stats;
        mongo.update('players', {
          query,
          set
        });
      });
      let _set = {};
      _set['stats.40'] = fg;
      mongo.update('players', {
        query,
        set: _set
      });
      console.log(kicker.fullname);
    })
  });
}

let _players;

function tallyPlayer(index = 0) {
  if (index >= _players.length) {
    console.log('All Done');
    return;
  }
  let player = _players[index];
  const query = {
    _id: player._id
  };
  let stats = player.stats;
  let score = 0;
  Object.keys(stats).forEach(key => stats[key] = 0);
  player.weeks.forEach(week => {
    score += week.score;
    if (!week.stats) return;
    Object.keys(week.stats).forEach(key => {
      if (isNaN(key)) return;
      if (!stats.hasOwnProperty(key)) return;
      stats[key] += convert(week.stats[key]);
    })
  })
  const set = {
    stats,
    score
  };
  mongo.update('players', {
    query,
    set
  });
  console.log(index, player.fullname);
  setTimeout(tallyPlayer(++index), 200);
}

function tallyStats() {
  mongo.find('players').then(res => {
    fs.writeFileSync('data/allPlayers.json', JSON.stringify(res, null, 2));
    _players = res;
    tallyPlayer();
  })
}

setTimeout(() => {
  //console.log("starting live scoring");
  init();
}, 1000 * 60 * 5);
// */
//checkTime();

module.exports = {
  stats() {
    //getStats();
  },
  init
};