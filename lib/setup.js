// jshint esversion:8

const mongo = require('./cflmongo');
const axios = require('axios');
const fs = require('fs-extra');
const _ = require('lodash');
const url = "https://api.fantasy.nfl.com/v3/players?includeLegacyIds=true&appKey=12345";
const nflurl = "https://api.fantasy.nfl.com/v2/players/weekstats?season=2021&week=";
// const d = JSON.parse(fs.readFileSync(`${__dirname}/draft-results.json`));
const { currentWeek } = require('./general');

function loadTeams() {
    // axios.get(url)
    //     .then(res => {
    //         const teams = _.chain(res.data.included)
    //                         .sortBy(x => x.attributes.abbr)
    //                         .map((x, index) => {
    //                             const d = x.attributes;
    //                             return {
    //                                     _id: index + 1,
    //                                     lgId: x.id,
    //                                     abbr: d.abbr,
    //                                     byeWeek: d.byeWeek,
    //                                     city: d.city,
    //                                     fullName: d.fullName,
    //                                     nickName: d.nickName,
    //                                     image: d.imageUrl,
    //                                 }   
    //                             })
    //                         .value();
    //         //mongo.inesertMany('nflteams', teams);
    //         console.clear();
    //         console.log('ALL DONE');
    //     });
    mongo.find('nflteams')
        .then(res => {
            console.clear();
            console.log('teams', res);
        })
}

async function updatePlayers() {
    const teams = await mongo.find('nflteams');
    const length = currentWeek();
    const allWeeks = Array.from({length}, (_, i) => i + 1);
    axios.get(url)
        .then(res => {
            const positions = ["DEF", "RB", "WR", "K", "TE", "QB"];
            const players = _.chain(res.data.data)
                              .filter(x => _.includes(positions, x.attributes.position))
                              .value();

            _.each(players, async player => {
                const data = player.attributes;
                const _id = data.legacyIds.fantasyPlayerId;
                const t = _.find(teams, t => t.lgId === (player.relationships.nflTeam.data && player.relationships.nflTeam.data.id));
                const currTeam = t && t._id || 0;
                const query = { _id };
                const db = await mongo.find('players', { query });
                if (!db.length) {
                    console.log(`${data.name} is not in the database`);
                    const position = data.position === "TE" ? "WR" : data.position;
                    const weeks = _.map(allWeeks, num => {
                        return {
                        num,
                        cflteam: 0,
                        nflteam: 0,
                        score: 0,
                        stats: {}
                        }
                    });
                    (_.last(weeks)).nflteam = currTeam;
                    const info = {
                        _id,
                        score: 0,
                        firstname: data.firstName,
                        lastname: data.lastName,
                        fullname: data.nickName,
                        number: data.jerseyNumber,
                        position,
                        pic: data.imageUrl,
                        lgId: player.id,
                        weeks,
                        stats: {}
                    }
                    mongo.insertOne('players', info);
                } else {
                    const dbTeam = (_.last(db[0].weeks)).nflteam;
                    if (dbTeam !== currTeam) {
                        const set = {};
                        set[`weeks.${length-1}.nflteam`] = currTeam;
                        console.log(`${data.name} is on a new team! ${dbTeam} ==> ${currTeam}`);
                        mongo.update('players', { query, set });
                    }
                }
            });
            console.log('update players done!!!');
        })
}

function init() {
    //_.each(['statCodes', 'settings'], x => mongo.inesertMany(x, JSON.parse(fs.readFileSync(`${__dirname}/collections/${x}.json`))));
    const data = JSON.parse(fs.readFileSync(`${__dirname}/collections/cflschedule.json`));
    const cflschedule = _.chain(data)
                .filter(x => x.week < 15)
                .map(x => {
                        return {
                            _id: x._id,
                            team1: {
                                id: x.team1,
                                score: 0,
                                tiebreaker: 0
                            },
                            team2: {
                                id: x.team2,
                                score: 0,
                                tiebreaker: 0
                            },
                            week: x.week,
                            winner: null
                        }
                    })
                .value();
    //mongo.inesertMany('cflschedule', cflschedule);
    console.log('cflschedule', cflschedule);
                
}

async function dodraft() {
    let players = await mongo.find('players');
    let draft = [];
    _.each(d, (pick, index) => {
        let player = _.find(players, x => x.fullname === pick);
        const _id = player._id;
        // const round = Math.floor(index / 12) + 1;
        // let team = (index % 12) + 1;
        // if (!(round % 2)) team = 13 - team;
        // console.log(`Rnd ${round}`, `team ${team}`, _id, pick);
        // const data = {};
        // data.query = { _id };
        // data.set = { 'weeks.0.cflteam': team };
        // mongo.update('players', data);
        draft.push(_id);
    })
    mongo.update('settings', { query: { _id: '5d8153fdeb96554ed07993ae'}, set: { draft }});
    console.log('all done');
}

async function nflschedule(n = 1) {
    if (n > 17) {
        console.log('all done', s);
        // const query = { year: 2021 };
        // const set = { nflschedule: s };
        // mongo.update('settings', { query, set });
        return;
    }
    const nfl = await mongo.find('nflteams');
    axios.get(nflurl + n)
        .then(res => {
            const schedule = res.data.nflGames;
            const week = { week: n };
            week.games = _.map(schedule, x => {
                const game = {};
                game._id = x.nflGameId;
                game.week = n;
                game.time = x.gameDateAndTime;
                game.status = x.gameStatus;
                game.quarter = x.gameQuarter;
                game.clock = x.gameClock;
                game.home = {
                    id: (_.find(nfl, t => t.nflTeamId === x.homeTeam.nflTeamId))._id,
                    score: x.homeTeam.score
                }
                game.away = {
                    id: (_.find(nfl, t => t.nflTeamId === x.awayTeam.nflTeamId))._id,
                    score: x.awayTeam.score
                }
                mongo.insertOne('nflschedule', game);
                return game;
            });
            week.byes = _.chain(nfl)
                            .filter(x => x.byeWeek === n)
                            .map(x => x._id)
                            .value();
            s.push(week);
            nflschedule(++n);
        });
}

module.exports = {
    updatePlayers,
}