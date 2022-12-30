const _ = require('lodash');
const mongo = require('./cflmongo');
const { currentWeek } = require('./general');
const fs = require('fs-extra');
const path = require('path');

// let choices = {};
// for (let i = 1; i <= 20; i++) choices[i] = 0;


// for (let j = 0; j < 3; j++) {
//     choices[Math.floor(Math.random()*20+1)]++;
// }

// choices = _.sortBy(_.toPairs(choices), 1).reverse() 
// console.log(choices);

async function addPlayer(_id, team, IR = false) {
    //return;
    //console.log('We are adding a player', _id, team);
    const week = await currentWeek();
    let query = { _id };
    let set = {};
    set[`weeks.${week-1}.cflteam`] = team;
    if (IR) set[`weeks.${week-1}.IR`] = true;
    await mongo.update('players', { query, set });
    console.log(`Player #${_id} added to Team #${team}`);
}

async function dropPlayer(_id, IR = false) {
   // return;
    const week = await currentWeek();
    let query = { _id };
    let set = {};
    if (IR)
        set[`weeks.${week-1}.IR`] = true;
    else
        set[`weeks.${week-1}.cflteam`] = 0;
    await mongo.update('players', { query, set });
    console.log(`Player #${_id} is now a free agent`);
}

async function doStuff() {
    const currWeek = await currentWeek();

    const file = path.join("C:","CFL 2022","Repo","cfl-server-2021","lib", "settings.json");
    console.log(file);
    //*
    const data = fs.readJSONSync(file);
    const week = data[0].weeks.find(week => week.num === 17);
    let waivers = week.waivers[1].filter(w => w.active);
    let moves = week.moves[1];
    fs.writeJSONSync('lib/moves.json', moves);
    const puOrder = _.map(moves, x => x.team);
    
    //*
    
    let teams = {};
    waivers.forEach(waiver => {
        const team = waiver.team;
        delete waiver.changes;
        delete waiver.time;
        delete waiver.active;
        if (!!waiver.IR) {
            delete waiver.IR;
            waiver.IR = true;
        }
        if (!teams[team]) teams[team] = [];
        teams[team].push(waiver);
    });
    
    let order = {};
    _.each(teams, (index, team) => {
        order[team] = _.orderBy(index, ['order'], ['asc']);
    })
    
    let ids = _.filter(puOrder, x => !!order[x]);
    
    let g = {};
    _.each(ids, x => g[`team${x}`] = order[x]);
    fs.writeJSONSync('lib/waivers.json', order);
    
    let chosen = [];
    
    _.each(puOrder, team => {
        let data = { team };
        if (!g[`team${team}`]) {
            chosen.push(data);
            return;
        }
        const t = g[`team${team}`];
        const picks = _.map(_.filter(chosen, x => !!x.pu), c => c.pu);
        const pick = _.find(t, p => !(picks.includes(p.pu)));
        if (!!pick) {
            delete pick.order;
            chosen.push(pick);
        } else {
            chosen.push(data);
        }
    });
    
    let fixes = [];
    
    _.each(chosen, (pick, index) => {
        if (!pick.pu) return;
        if (_.isEqual(pick, moves[index])) return;
        // console.log(pick);
        // console.log(moves[index]);
        const team = pick.team;
        const move = moves[index];
        if (pick.pu !== move.pu) {
            if (pick.pu) addPlayer(pick.pu, team);
            if (move.pu) dropPlayer(move.pu);
        }
    
        if (pick.drop !== move.drop) {
            if (pick.drop) dropPlayer(pick.drop);
            if (move.drop) addPlayer(move.drop, team);
        }
        // console.log("");
        moves[index] = pick;
    });
    
    fs.writeJSONSync('lib/picks.json', chosen);

    console.log('ALL DONE');
    
    const query = { year: 2022 };
    const push = {};
    push[`weeks.${currWeek-1}.moves`] = moves;
    await mongo.pushToArray('settings', { query, push });
    
    // console.log(moves);
}

setTimeout(doStuff, 3000);
// console.log(chosen);

// */