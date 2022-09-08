const _ = require('lodash');
const mongo = require('./cflmongo');
const api = require('./cflapi');
const { currentWeek } = require('./general');
const { schedule$, commands } = require('./rxjs');
const { emit } = require('./socket');

const nfl = [];
let livescoring = false;

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
    const week = await currentWeek();
    if (week === 1) {
        if (!!livescoring) schedule$.next(commands.LIVESCORING);
        livescoring = false;
        return;
    }
    const settings = (await mongo.find('settings'))[0];
    const nflschedule = _.filter((_.find(settings.nflschedule, x => x.week === week)).games, x => x.status !== "pre_game");
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
    const query = { year: 2022 };
    const addToSet = {};
    addToSet[`weeks.${week-1}.moves`] = moves;
    await mongo.addToArray('settings', { query, addToSet });
    console.log('all done. see if it worked', query, addToSet);
    fixMoves();
}

schedule$
    .subscribe(data => {
        livescoring = data === commands.MOVESANDLIVESCORING;
        if (data === commands.MOVES || data === commands.MOVESANDLIVESCORING) domoves();
    });