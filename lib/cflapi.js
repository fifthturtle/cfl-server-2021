// jshint esversion:8
const mongo = require("./cflmongo");
const {
    getCurrentWeek
} = require("./general");
const _ = require('lodash');

const limits = {
    QB: 2,
    RB: 5,
    WR: 5,
    K: 2,
    DEF: 2,
};

function getStreak(games, team) {
  const strk = _.map(games, x => {
    return x.winner === team ? "W" : "L";
  });
  const type = _.first(strk);
  let broken = false;
  let num = 0;
  _.each(strk, x => {
    if (broken) return;
    if (x === type)
      num++;
    else
      broken = true;
  });

  return `${type}${num.toString()}`;
}

module.exports = {
  async moves() {
    return mongo.find('settings')
            .then(async res => {
              const moves = _.map(res[0].weeks, x => x.moves);
              const activations = _.map(res[0].weeks, x => x.activations);
              const trades = _.map(res[0].weeks, x => x.trades);
              return {
                moves,
                activations,
                trades
              }
            })
  },
  async draft() {
    const query = { year: 2021 };
    return await mongo.find('settings', { query })
                  .then(res => {
                    return _.map(res[0].draft, (id, index) => {
                      const round = Math.floor(index / 12) + 1;
                      let team = (index % 12) + 1;
                      if (!(round % 2)) team = 13 - team;
                      return {
                        id,
                        round,
                        team
                      }
                    });
                  });
  },
  async players() {
    return await mongo.find('players');
  },
  async owners() {
    return mongo.find('owners')
              .then(res => {
                return _.map(res, x => {
                  delete x.password;
                  delete x.initialized;
                  delete x.reset;
                  return x;
                })
              })
  },
  async cflteams() {
    const schedule = await this.cflschedule();
    return await mongo.find('teams')
          .then(res => {
            return _.map(res, team => {
              const ts = _.filter(schedule, x => x.team1.id === team._id || x.team2.id === team._id);
              const wins = _.filter(ts, x => !!x.winner && x.winner === team._id);
              const losses = _.filter(ts, x => !!x.winner && x.winner !== team._id);
              team.wins = wins.length;
              team.losses = losses.length;
              team.pct = (team.wins + team.losses) ? team.wins / (team.wins + team.losses) : "";
              team.streak = getStreak(_.chain(ts).filter(x => !!x.winner).reverse().value(), team._id);
              team.points = 0;
              _.each(ts, game => {
                if (!game.winner) return;
                if (game.team1.id === team._id) team.points += game.team1.score;
                if (game.team2.id === team._id) team.points += game.team2.score;
              });
              return team;
            })
          });
  },
  async nflteams() {
    return await mongo.find('nflteams');
  },
  async cflschedule(team = 0) {
    let query = {};
    if (!!team) query = {
        $or: [
          { 'team1.id': team },
          { 'team2.id': team }
        ]
    }
    return await mongo.find('cflschedule', { query, sort: { week: 1 }});
  },
  async nflschedule() {
    return await mongo.find('nflschedule');
  },
  async statCodes() {
    const query = { show: true };
    const sort = { _id: 1 };
    return await mongo.find("statCodes", { query, sort });
  },
  async week() {
    return await getCurrentWeek();
  },
  async activations() {
    return {};
  },
  async addWaiver() {
    return {};
  },

  async login(owner_id, password) {
    const query = {
      owner_id,
      password
    };
    return await mongo.find('owners', { query });
  },
  async settings() {
    return (await mongo.find('settings')).pop();
  }

};
