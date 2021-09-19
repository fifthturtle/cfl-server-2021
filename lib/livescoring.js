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
const scheduler = require('./scheduler');
const { commands, schedule$ } = require('./rxjs');

let cflteams;
let players = {};
let nflschedule = {};
let liveScoringActive = false;
let week;

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

  score += convert(s[34]) * 3;
  score += convert(s[38]);
  score += convert(s[39]) * 2;
  return score;
}

async function init() {
  week = await currentWeek();
  console.log('starting live scoring', week);
  liveScoringActive = true;
  cflteams = await cflapi.cflteams();
  let nfl = await cflapi.nflschedule();
  nfl = _.filter(nfl, x => x.week === week);
  _.each(nfl, x => nflschedule[x._id] = x);
  const plrs = await cflapi.players();
  _.each(plrs, x => players[x._id] = x);
  console.log('got all players');
  setTimeout(getStats, 2000);
}

async function CFLSocketData() {
  const query = { week };
  await mongo.find('cflschedule', { query })
    .then(res => {
      const socketData = _.map(res, x => {
        return {
          id: x._id,
          data: {
            team1: x.team1,
            team2: x.team2,
          }
        }
      });
      socket.emit('cflschedule', socketData);
      console.log('emit', socketData);
      console.log('emit schedule', nflSocketData);
      console.log('emit players', playerSocketData);
      if (!!nflSocketData.length) socket.emit('nflschedule', nflSocketData);
      if (!!playerSocketData.length) socket.emit('player-stats', playerSocketData);
      setTimeout(getStats, 5000);
    })
}

async function teamScore(index = 0) {
  if (index >= cflteams.length) {
    CFLSocketData();
    return;
  }
  const team = cflteams[index];
  const id = team._id;
  const roster = _.chain(players)
                  .filter(x => x.weeks[week - 1].cflteam === id && !x.weeks[week-1].IR)
                  .sortBy(x => x.weeks[week - 1].score)
                  .sortBy('position')
                  .reverse()
                  .value();

    let ret = {};
    let score = 0;
    let tiebreaker = 0;
    _.each(Object.keys(positions), pos => ret[pos] = []);
    _.each(roster, plr => {
      const _week = plr.weeks[week-1];
      const pos = plr.position;
      if (!!_week.IR) return;
      if (ret[pos].length >= positions[pos]) return;
      if (!ret[pos].length) tiebreaker += _week.score;
      score += _week.score;
      ret[pos].push(plr);
    });
    
    console.log(team.team_name, score, tiebreaker);
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
}

async function updateGames(games) {
  let num = 0;
  _.each(Object.keys(games), _id => {
    const nfl = nflschedule[_id];
    if (nfl.status === 'game_closed') return;
    const game = games[_id];
    const started = (game.gameStatus !== "pre_game");
    if (!started) return;
    num++;
    nfl.status = game.gameStatus;
    nfl.clock = game.gameClock;
    nfl.home.score = game.homeTeam.score;
    nfl.away.score = game.awayTeam.score;
    const query = { _id };
    const set = { status: nfl.status, clock: nfl.clock, 'home.score': nfl.home.score, 'away.score': nfl.away.score }
    mongo.update('nflschedule', { query, set });
    nflSocketData.push(
      {
        id: _id,
        data: {
          status: nfl.status,
          clock: nfl.clock,
          homeScore: nfl.home.score,
          awayScore: nfl.away.score,
        }
      }
    )
  });
  return num;
}

let playerSocketData = [];
let nflSocketData = [];

function getStats() {
  const url = `https://api.fantasy.nfl.com/v2/players/weekstats?season=${year}&week=${week}`;
  playerSocketData = [];
  nflSocketData = [];
  axios
    .get(url)
    .then(res => {
      let numGames = updateGames(res.data.nflGames);
      console.log('numGames', numGames);
      if (!numGames) {
        console.log('livescoring is coming to an end!');
        liveScoringActive = false;
        const upcoming = _.chain(nflschedule)
                          .filter(x => x.status === 'pre_game')
                          .sortBy('time')
                          .reverse()
                          .value();
        if (!upcoming.length) {
          scheduler.updateScoringTime()
        } else {
          scheduler.updateScoringTime(upcoming[0].time);
        }
        return;
      }
      let _players = res.data.games[102021].players;
      if (!_players) {
        setTimeout(getStats, 5000);
        return;
      }
      Object.keys(_players).forEach(_id => {
        const player = players[_id];
        if (!player) return;
        const _week = player.weeks[week - 1];
        const stats = _players[_id].stats.week[year][week];
        if (player.position === "K") {
          stats[34] = 0;
          _.each([35, 36, 37, 38, 39], x => stats[34] += convert(stats[x]));
        }
        const score = (player.position === "DEF") ? getDefScore(stats) : getScore(stats);
        if (score === _week.score && _.isEqual(stats, _week.stats)) return;
        let query = { _id };
        let set = {};
        set[`weeks.${week-1}.score`] = score;
        set[`weeks.${week-1}.stats`] = stats;
        _week.score = score;
        _week.stats = stats;
        mongo.update('players', { query, set });
        playerSocketData.push({
          id: _id,
          week,
          data: {
            score,
            stats
          }
        });
      });
      teamScore();
    });
}


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

schedule$
  .subscribe(data => {
    if (!!liveScoringActive) return;
    if (data === commands.LIVESCORING) init();
  })

module.exports = {
  init,
  liveScoringActive,
};