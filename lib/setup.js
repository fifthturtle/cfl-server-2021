// jshint esversion:8


  let players = [
    "Lamar Jackson",
"Josh Allen",
"Jayden Daniels",
"Joe Burrow",
"Jalen Hurts",
"Justin Herbert",
"Patrick Mahomes",
"Bo Nix",
"Baker Mayfield",
"Saquon Barkley",
"Jordan Love",
"Bijan Robinson",
"Kyler Murray",
"Ja'Marr Chase",
"Brock Purdy",
"Dak Prescott",
"Derrick Henry",
"Jahmyr Gibbs",
"Christian McCaffrey",
"Ashton Jeanty",
"Jonathan Taylor",
"Kyren Williams",
"Justin Fields",
"CeeDee Lamb",
"Caleb Williams",
"Justin Jefferson",
"Jared Goff",
"Drake Maye",
"Josh Jacobs",
"C.J. Stroud",
"Michael Penix Jr.",
"Nico Collins",
"Bucky Irving",
"J.J. McCarthy",
"TreVeyon Henderson",
"De'Von Achane",
"Trevor Lawrence",
"Matthew Stafford",
"Chase Brown",
"James Cook",
"Geno Smith",
"Chuba Hubbard",
"James Conner",
"Tua Tagovailoa",
"Omarion Hampton",
"Kenneth Walker III",
"Malik Nabers",
"Alvin Kamara",
"Cam Ward",
"Breece Hall",
"Bryce Young",
"David Montgomery",
"Isiah Pacheco",
"Puka Nacua",
"D'Andre Swift",
"Amon-Ra St. Brown",
"Sam Darnold",
"Tony Pollard",
"Brian Thomas Jr.",
"Aaron Rodgers",
"A.J. Brown",
"Drake London",
"Trey McBride",
"RJ Harvey",
"Aaron Jones",
"Jaylen Warren",
"Daniel Jones",
"Tee Higgins",
"Brock Bowers",
"Terry McLaurin",
"Kaleb Johnson",
"Ladd McConkey",
"Tyrone Tracy Jr.",
"Jordan Mason",
"Jaxon Smith-Njigba",
"Tyreek Hill",
"J.K. Dobbins",
"Marvin Harrison Jr.",
"Mike Evans",
"Cam Skattebo",
"Davante Adams",
"DK Metcalf",
"Rhamondre Stevenson",
"Jacory Croskey-Merritt",
"Garrett Wilson",
"Travis Etienne",
"Tetairoa McMillan",
"Calvin Ridley",
"DJ Moore",
"Spencer Rattler",
"Javonte Williams",
"George Kittle",
"Austin Ekeler",
"Nick Chubb",
"Courtland Sutton",
"Zach Charbonnet",
"Trey Benson",
"Xavier Worthy",
"DeVonta Smith",
"George Pickens",
"Jameson Williams",
"Zay Flowers",
"Najee Harris",
"Tank Bigsby",
"Jerome Ford",
"Joe Flacco",
"Rome Odunze",
"Russell Wilson",
"Tyler Allgeier",
"Travis Hunter",
"Jerry Jeudy",
"Jaylen Waddle",
"Deebo Samuel",
"Jaydon Blue",
"Ricky Pearsall",
"Emeka Egbuka",
"Matthew Golden",
"Quinshon Judkins",
"Braelon Allen",
"Dylan Sampson",
"Mark Andrews",
"Ray Davis",
"Jakobi Meyers",
"Rachaad White",
"Jaxson Dart",
"Brian Robinson",
"Travis Kelce",
"Sam LaPorta",
"Keon Coleman",
"Bhayshul Tuten",
"Rashee Rice",
"Chris Olave",
"T.J. Hockenson",
"Kareem Hunt",
"Cooper Kupp",
"Cedric Tillman",
"Roschon Johnson",
"Rashid Shaheed",
"Joe Mixon",
"Stefon Diggs",
"Jauan Jennings",
"Ollie Gordon II",
"Jordan Addison",
"David Njoku",
"Khalil Shakir",
"Jayden Reed",
"Chris Godwin Jr.",
"Tyler Shough",
"Denver Broncos",
"Michael Pittman",
"Evan Engram",
"Colston Loveland",
"Rico Dowdle",
"Will Shipley",
"Anthony Richardson",
"Woody Marks",
"Josh Downs",
"Minnesota Vikings",
"Tyjae Spears",
"Keenan Allen",
"Marvin Mims Jr.",
"Darnell Mooney",
"Pittsburgh Steelers",
"Brandon Aubrey",
"Baltimore Ravens",
"Chase McLaughlin",
"Kyle Monangai",
"Blake Corum",
"Arizona Cardinals",
"Philadelphia Eagles",
"Houston Texans",
"Cameron Dicker",
"Jake Bates",
"Detroit Lions",
"Tampa Bay Buccaneers",
"Jake Elliott",
"Buffalo Bills",
"Seattle Seahawks",
"Green Bay Packers",
"New England Patriots",
"Harrison Butker",
"Miles Sanders",
"Tyler Bass",
"Wil Lutz",
"New York Jets",
"Cairo Santos",
"Tyler Loop",
"Chris Rodriguez Jr.",
"Justice Hill",
"Ka'imi Fairbairn",
"Kansas City Chiefs",
"Chicago Bears",
"Chris Boswell",
"Evan McPherson",
"San Francisco 49ers",
"Matt Gay",
"New York Giants",
"Joshua Karty",
"Chad Ryland",
"Indianapolis Colts",
"Los Angeles Chargers",
"Dallas Cowboys",
"Nick Folk",
"Los Angeles Rams",
"Jason Myers",
"Jake Moody",
"Brandon McManus",
"Younghoe Koo",
"Blake Grupe",
"Washington Commanders",
"Kendre Miller",
"Tyler Warren",
"Jacksonville Jaguars",
"Jarquez Hunter",
"Will Reichard",
"Cam Little"
    ]

const mongo = require('./cflmongo');
const axios = require('axios');
const fs = require('fs-extra');
const _ = require('lodash');
const url = "https://api.fantasy.nfl.com/v3/players?includeLegacyIds=true&appKey=12345";
const nflurl = "https://api.fantasy.nfl.com/v2/players/weekstats?season=2025&week=";
// const d = JSON.parse(fs.readFileSync(`${__dirname}/draft-results.json`));
const { currentWeek } = require('./general');
const { emit } = require('./socket');
const { commands, schedule$ } = require('./rxjs');

let nflschedule = [];
let teamCodes = {};
let teamNames = {};

function getTeamCodes(week = 1) {
  mongo.find("nflteams").then(x => {
    _.each(x, tm => {
      teamCodes[tm.nflTeamId] = tm._id;
      teamNames[tm.nflTeamId] = tm.nickName;
    })
    console.log('Team Codes done');
    nfl();
    //updatePlayers();
  });
}

function UpdateNFL() {
  const week = _.first(nflschedule_bu).week;
  console.log("WEEK ", week);
  console.log(nflschedule_bu[0].games.length)
  _.each(nflschedule_bu[0].games, gm => {
    const query = { _id: gm._id };
    const set = gm;
    mongo.update('nflschedule', { query, set });
  })
}

function nfl(week = 1) {
  if (week >= 19) {
    let data = [];
    _.each(nflschedule, week => {
      let num = week.week;
      week.games = _.map(week.games, x => {
        x.week = num;
        return x;
      });
      // _.each(week.byes, _id => {
      //   const query = { _id };
      //   const set = { byeWeek: num };
      //   mongo.update('nflteams', { query, set });
      // })
      data.push(week.games);
    })
    // fs.writeFileSync(`lib/nflschedule/nflWeeks.json`, JSON.stringify(_(data).flatten().value(), null, 2));
    mongo.inesertMany('nflschedule', _(data).flatten().value());
    // const query = { year: 2022 };
    // const set = { nflschedule_bu };
    // fs.writeFileSync('week18.json', JSON.stringify(set, null, 2));
    // // mongo.addToArray('settings', { query, addToSet });
    // mongo.update('settings', { query, set });
    // UpdateNFL();
    console.log('All Done!');
    return;    
  }
  let byes = Array.from({length: 32}, (_, i) => i + 1);
  axios.get(`${nflurl}${week}`)
    .then(res => {
      console.log('Week ' + week);
      // fs.writeFileSync(`nflWeek-${week}.json`, JSON.stringify(res.data.nflGames, null, 2));
      let games = [];
      _.each(res.data.nflGames, gm => {
        const home = {
          id: teamCodes[gm.homeTeam.nflTeamId],
          team: teamNames[gm.homeTeam.nflTeamId],
          score: gm.homeTeam.score
        }
        const away = {
          id: teamCodes[gm.awayTeam.nflTeamId],
          team: teamNames[gm.awayTeam.nflTeamId],
          score: gm.awayTeam.score
        }
        let obj = {
          _id: gm.nflGameId,
          time: gm.gameDateAndTime,
          status: gm.gameStatus,
          quarter: gm.gameQuarter,
          clock: gm.gameClock,
          home,
          away
        }
        byes = _.difference(byes, [home.id, away.id]);
        games.push(obj);
      });
      nflschedule.push({ week, games, byes });
      nfl(++week);
    });
}

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

function AddPlayerToTeam(_id, cflteam) {
    const query = { _id };
    const set = {
      'weeks.0.cflteam': cflteam
    }
    mongo.update('players', { query, set });
}

async function loadDraft(n = 0, draft = []) {
  if (n >= players.length) {
    console.log('All IDS', draft);
    const query = { year: 2025};
    const set = { draft };
    mongo.update('settings', { query, set });
    console.log('All done!');
    return;
  }
  const round = Math.floor(n/12) + 1;
  const pick = (n % 12) + 1;
  const team = (round % 2 === 0) ? 13 - pick : pick;
  const fullname = players[n++];
  const query = { fullname };
  mongo.find('players', { query })
    .then(x => {
      if (x.length > 1) {
        console.log(`${n}. ${fullname} appears twice!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
      } else {
       if (!x.length) console.log(`${n}. ${fullname} NOT FOUND IN DB`)
      }
      console.log(`${n}. ${fullname} (${x[0]._id}) -- ROUND ${round}, PICK ${pick}, CFL TEAM: ${team}`);
      draft.push(x[0]._id);
      AddPlayerToTeam(x[0]._id, team);
      loadDraft(n, draft);
    })
  // _.each(players, async (fullname, index) => {
  //   const query = { fullname };
  //   const db = await mongo.find('players', { query });
  //   if (!db.length) {
  //     console.log(`Pick ${index+1} (${fullname}) is not in the database`);
  //   } else {
  //     if (db.length > 1) {
  //       console.log(`Pick ${index+1} (${fullname}) has more than one entry in the database`);
  //     } else {
  //       console.log(`Pick ${index + 1} (${fullname}) is id number ${db._id}`);
  //     }
  //   }
  // })
}

async function updatePlayers() {
    console.log('updating players');
    const teams = await mongo.find('nflteams');
    const length = await currentWeek();
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
                    await mongo.insertOne('players', info);
                } else {
                    const dbTeam = (_.last(db[0].weeks)).nflteam;
                    if (dbTeam !== currTeam || db[0].pic !== data.imageUrl) {
                        const set = {};
                        if (dbTeam !== currTeam) {
                            set[`weeks.${length-1}.nflteam`] = currTeam;
                            console.log(`${data.name} is on a new team! ${dbTeam} ==> ${currTeam}`);
                        }
                        if (db[0].pic !== data.imageUrl) {
                            set.pic = data.imageUrl;
                            console.log(`${data.name} has a new picture!`);
                        }
                        await mongo.update('players', { query, set });
                    }

                }
            });
            console.log('update players done!!!');
            // loadDraft();
            // emit('refresh-players');
        })
}

async function fixPlayers() {
  let players = await mongo.find('players');
  players = _.filter(players, x => x.weeks.length > 18);
  _.each(players, async plr => {
    // plr.weeks = _.filter(plr.weeks, x => !!x.num);
    console.log(plr.fullname + " was corrupted!");
    const query = { _id: plr._id };
    const pop = { weeks: 1 }
  
    await mongo.popFromArray('players', { query, pop });
  });

  // db.students.updateOne( { _id: 10 }, { $pop: { scores: 1 } } )

  // fs.writeFileSync(`players.json`, JSON.stringify(players, null, 2));

  let fewer = _.filter(players, x => x.weeks.length < 18);
  fs.writeFileSync(`fewer.json`, JSON.stringify(fewer, null, 2));

  console.log("ALL DONE", players.length + " --> " + fewer.length);
}

async function fixPlayers2() {
  let players = await mongo.find('players');
  _.each(players, async plr => {
    // plr.weeks[0].score = 0;
    // plr.weeks[0].stats = {};
    let query = { _id: plr._id };
    let set = {};
    set['weeks.0.score'] = 0;
    set['weeks.0.stats'] = {};
    await mongo.update('players', { query, set });
    console.log(plr.fullname + " has been updated");
  });
  // await mongo.updateMany('players', players);
  console.log('done');

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
        const round = Math.floor(index / 12) + 1;
        let team = (index % 12) + 1;
        if (!(round % 2)) team = 13 - team;
        console.log(`Rnd ${round}`, `team ${team}`, _id, pick);
        const data = {};
        data.query = { _id };
        data.set = { 'weeks.0.cflteam': team };
        mongo.update('players', data);
        draft.push(_id);
    })
    mongo.update('settings', { query: { _id: '5d8153fdeb96554ed07993ae'}, set: { draft }});
    console.log('all done');
}

// async function nflschedule(n = 19) {
//     console.log('running nfl schedule');
//     if (n > 18) {
//         // console.log('all done', s);
//         const query = { year: 2021 };
//         const set = { 'nflschedule.17.games': week18 };
//         mongo.update('settings', { query, set });
//         return;
//     }
//     const nfl = await mongo.find('nflteams');
//     axios.get(nflurl + n)
//         .then(res => {
//             const schedule = res.data.nflGames;
//             const week = { week: n };
//             week.games = _.map(schedule, x => {
//                 const game = {};
//                 game._id = x.nflGameId;
//                 game.week = n;
//                 game.time = x.gameDateAndTime;
//                 game.status = x.gameStatus;
//                 game.quarter = x.gameQuarter;
//                 game.clock = x.gameClock;
//                 game.home = {
//                     id: (_.find(nfl, t => t.nflTeamId === x.homeTeam.nflTeamId))._id,
//                     score: x.homeTeam.score
//                 }
//                 game.away = {
//                     id: (_.find(nfl, t => t.nflTeamId === x.awayTeam.nflTeamId))._id,
//                     score: x.awayTeam.score
//                 }
//                 mongo.insertOne('nflschedule', game);
//                 return game;
//             });
//             week.byes = _.chain(nfl)
//                             .filter(x => x.byeWeek === n)
//                             .map(x => x._id)
//                             .value();
//             // s.push(week);
//             nflschedule(++n);
//         });
// }

function getOwners() {
  mongo.find('cflschedule')
    .then(x => {
      // _.sortBy(x, t => t.draftOrder);
      let s = _.sortBy(x, t => t.week);
      s = _.filter(s, m => m.week <= 15);
      s = _.map(s, m => {
        m.winner = null;
        m.team1.score = 0;
        delete m.team1.tiebreaker;
        m.team2.score = 0;
        delete m.team2.tiebreaker;
        return m;
      })
      fs.writeJSON('cflschedule.json', s);
      console.log('All Done!!!!');
    })
}

async function saveWeek() {
  const query = { year: 2023 };
  let addToSet = {};

  let i = 2;
  while (i <= 17) {
    addToSet = {};
    let week = {
        num: i++,
        started: false,
        moves: [],
        activations: [],
        waivers: [
          [],[],[],[],[]
        ],
    }
    addToSet['weeks'] = week;
    await mongo.addToArray('settings', { query, addToSet });
    console.log(`Week ${week.num} updated!`);
  }
  console.log('All Weeks Done!');
}

async function saveMoves(moves, week) {
  const query = { year: 2022 };
  const push = {};
  push[`weeks.${week-1}.activations`] = moves;
  await mongo.pushToArray('settings', { query, push });
  console.log('all done. see if it worked', query, push);
}


let n = 0;
let s = "second";

async function checkForUpdates() {
  console.log(`${++n} ${s}`);
  s = "seconds";
  if (mongo.connected()) {
    // let i = 3;
    // while (i <= 17) {
    //   let obj = {
    //     num: i++,
    //     started: false,
    //     moves: [],
    //     activations: [],
    //     waivers: [[]]
    //   }
    //   await saveWeek(obj);
    // }
    // console.log('All Done!');
    saveMoves([0,1,2,3,4,5], 2);
  } else {
    setTimeout(checkForUpdates, 1000);
  }
} 

// ePYZDKyNAppVjGTv0i8W03f7
// d79117afb5bebf782a163ceb79d86a6cd643f5cd

async function getNFL() {
  //getTeamCodes();
  //saveWeek();
  //loadDraft();
  //fixPlayers2();
  // updatePlayers();
  // nfl();
  // console.log(nflurl);
  
  // const length = await currentWeek();
  // console.log('Curr Week', length);
}

//setTimeout(checkForUpdates, 1000);

// setTimeout(loadDraft, 4000);
// nflschedule();

schedule$
    .subscribe(data => {
        if (data === commands.UPDATEPLAYERS) updatePlayers();
    })