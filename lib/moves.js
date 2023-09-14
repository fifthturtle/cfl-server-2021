const _ = require('lodash');
const mongo = require('./cflmongo');
const api = require('./cflapi');
const { currentWeek } = require('./general');
const { schedule$, commands } = require('./rxjs');
const { emit } = require('./socket');

const nfl = [];
let livescoring = false;

const valids = {
    "QB": 2,
    "RB": 5,
    "WR": 5,
    "K": 2,
    "DEF": 2
}

async function fixMoves() {
    console.log('fixing moves - just in case!');
    const week = (await currentWeek()) - 1;
    const settings = await mongo.find('settings');
    const moves = _.last(settings[0].weeks[week].moves);

    _.each(moves, async move => {
        const _id = move.pu;
        if (!_id) return;
        const cflteam = move.team;
        const query = { _id };
        const set = {};
        set[`weeks.${week}.cflteam`] = cflteam;
        await mongo.update('players', { query, set });
    })
    console.log('all players updated');
    if (!!livescoring) schedule$.next(commands.LIVESCORING);
    livescoring = false;
    emit("refresh-all");
}

async function domoves() {
   // return;
    const week = await currentWeek();
    if (week === 1) {
        if (!!livescoring) schedule$.next(commands.LIVESCORING);
        livescoring = false;
        return;
    }
    const settings = (await mongo.find('settings'))[0];
    // const nflschedule = _.filter(
    //                         (_.find(settings.nflschedule, x => x.week === week)).games, 
    //                         x => x.status !== "pre_game"
    //                     );
    const nflschedule = await mongo.find('nflschedule', {
        query: {
            week,
            status: {
                "$ne": "pre_game"
            }
        }
    });
    _.each(nflschedule, x => nfl.push(x.home.id, x.away.id));
    const query = { $or: [{}, {}]};
    query.$or[0][`weeks.${week-1}.cflteam`] = { $gt: 0 };
    query.$or[1][`weeks.${week-1}.nflteam`] = { $in: nfl };
    const players = _.map(await mongo.find('players', { query }), x => x._id);
    
    const teams = _.chain(await api.cflteams())
                        .orderBy(['wins', 'points', 'team_name'], ['desc', 'desc', 'asc'])
                        .map(x => x._id)
                        .reverse()
                        .value();
    const cw = _.find(settings.weeks, x => x.num === week);
    const round = cw.moves.length;
    const waivers = cw.waivers[round];
    const moves = [];
    _.each(teams, team => {
        const picks = _.chain(waivers)
                        .filter(x => x.team === team && !!x.active)
                        .orderBy('order')
                        .value();
        let pick = _.find(picks, x => !(_.includes(players, x.pu)));
        const move = { team };
        if (!!pick) {
            players.push(pick.pu);
            move.pu = pick.pu;
            if (!!pick.drop) move.drop = pick.drop;
            if (!!pick.IR) move.IR = pick.IR;
        }
        moves.push(move);
    });

    _.each(moves, async move => {
        if (!move.pu) return;
        let query = { _id: move.pu };
        let set = {};
        set[`weeks.${week-1}.cflteam`] = move.team;
        if (!move.drop && !!move.IR) set[`weeks.${week-1}.IR`] = true;
        await mongo.update('players', { query, set });
        if (!!move.drop) {
            query._id = move.drop;
            if (!!move.IR) {
                set[`weeks.${week-1}.IR`] = true;
            } else {
                set[`weeks.${week-1}.cflteam`] = 0;
            }
            await mongo.update('players', { query, set });
        }
    });
    
    saveMoves(moves, week);
}

async function saveMoves(moves, week) {
    const query = { year: 2023 };
    const push = {};
    push[`weeks.${week-1}.moves`] = moves;
    await mongo.pushToArray('settings', { query, push });
    console.log('all done. see if it worked', query, push);
    fixMoves();
}

async function getPlayer(_id) {
    const query = { _id };
    const player = await mongo.find('players', { query });
    return player[0];
}

async function getTeam(_id) {
    const week = (await currentWeek()) - 1;
    let query = {};
    query[`weeks.${week}.cflteam`] = _id;
    const team = await mongo.find('players', { query });
    return team;
}

function teamRosterSize(team, position) {
    let t = _.filter(team, x => x.position === position && !((_.last(x.weeks)).IR));
    return t.length;
}

function numIR(team) {
    let t = _.filter(team, x => _.last(x.weeks).IR);
    return t.length;
}

function isFA(plr) {
    const week = _.last(plr.weeks);
    return week.cflteam === 0;
}

function plrActiveOnTeam(plr, team) {
    const player = _.find(team, x => x._id === plr._id);
    if (!player) return false;
    return !((_.last(player.weeks)).IR);
}

// setTimeout(async () => {
//     // const query = {};
//     // query["weeks.10.waivers"]
//     // const team = await getTeam(3);
//     // console.log("QB: ", teamRosterSize(team, "QB"));
//     // console.log("RB: ", teamRosterSize(team, "RB"));
//     // console.log("WR: ", teamRosterSize(team, "WR"));
//     // console.log("K: ", teamRosterSize(team, "K"));
//     // console.log("DEF: ", teamRosterSize(team, "DEF"));
//     // console.log("IR: ", numIR(team));
//     const week = 12;
//     const nflschedule = await mongo.find('nflschedule', {
//         query: {
//             week,
//             status: {
//                 "$ne": "pre_game"
//             }
//         }
//     });
//     console.log(JSON.stringify(nflschedule));
//     return;
//     const settings = await mongo.find('settings');
//     waivers = settings[0].weeks[10].waivers[0];
//     let w;
//     let UpdatedWaivers = [];
//     for (var i = 0; i < waivers.length; i++) {
//         // waivers[i].isValid = await isWaiverValid(waivers[i]);
//         w = await isWaiverValid(waivers[i]);
//         // if (w.valid) {
//             UpdatedWaivers.push({
//                 team: waivers[i].team,
//                 info: w
//             })
//         // }
//     }
//     console.log(JSON.stringify(UpdatedWaivers));
// }, 3000);

function reason(info, msg) {
    return { valid: false, msg, info };
}

async function isWaiverValid(w) {
    const tm = await getTeam(w.team);
    const pu = await getPlayer(w.pu);
    const drop = (!!w.drop) ? await getPlayer(w.drop) : null;
    const info = {
        pickup : pu.fullname,
        IR: w.IR
    }
    if (!!drop) info.drop = drop.fullname;
    if (!w.active) return reason(info, "The Waiver has already been canceled");
    if (!isFA(pu)) return reason(info, `${pu.fullname} is not a free agent`);
    // At this point, we know that the player is a free agent.

    if (!!w.drop) {
        if (!plrActiveOnTeam(drop, tm)) return reason(info, `${drop.fullname} is not active on team`);
        const dPos = drop.position;
        const puPos = pu.position;

        if (dPos !== puPos) {
            if (teamRosterSize(team, dPos) <= valids[dPos]) return reason(info, `Too few ${dPos} on roster`);                   // if dropping this player will drop us below roster minimums, waiver not valid as players are of different positions
            if (teamRosterSize(team, puPos) >= (valids[puPos] + 2)) return reason(info, `Too many ${puPos} on roster`);            
        }
    } else {
        if (!w.IR) return reason(info, "Nobody to drop");
    }
    if (!!w.IR && numIR(tm) >= 3) return reason(info, "You have reached IR limits");
    return { valid: true, info };
}

schedule$
    .subscribe(data => {
        livescoring = data === commands.MOVESANDLIVESCORING;
        if (data === commands.MOVES || data === commands.MOVESANDLIVESCORING) domoves();
    });