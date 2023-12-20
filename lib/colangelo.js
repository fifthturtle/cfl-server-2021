/*
    [home/away]: {
        tricode: "",
        school: "",
        name: "",
        logo: "",
        primaryColor:"",
        secondaryColor:"",
        players: {
            number: 0,
            firstName: "",
            lastName: "",
            height: "",
            position: "",
            hometown: "",
            year: "",
            game: {
                cat1: "",
                stat1: "",
                cat2: "",
                stat2: "",
                cat3: "",
                stat3: "",
                cat4: "",
                stat4: "",
                cat5: "",
                stat5: ""
            },
            season: {
                cat1: "",
                stat1: "",
                cat2: "",
                stat2: "",
                cat3: "",
                stat3: "",
                cat4: "",
                stat4: "",
            }
        }
    }

    compare: {
        code: "",
        category: "",
        away: "",
        home: ""
    }
*/
const _ = require('lodash');

function initReset(home = '', away = '') {
    teams = {
        home: {
            tricode: home,
            players: []
        },
        away: {
            tricode: away,
            players: []
        }
    };
    compare = {};
}
let teams; 
let compare;


function addEditPlayer(playerData) {
    let team;
    if (teams.away.tricode === playerData.team) {
        team = teams.away;
    } else {
        if (teams.home.tricode === playerData.team) {
            team = teams.home;
        } else return;
    }

    let plr = _.find(team.players, x => x.number === playerData.number);
    if (!plr) {
        plr = { game: {}, season: {} };
        team.players.push(plr);
    }
    plr.game = _.merge(plr.game, playerData.game);
    plr.season = _.merge(plr.season, playerData.season);
    plr = _.merge(plr, _.omit(playerData, ["game", "season"]));
}

function changeCompare(compareData) {
    compare = compareData;
}

function addEditTeam(teamData, teamLocation = 'home') {
    let team = teams[teamLocation];
    team = _.merge(team, _.omit(teamData, ["players"]));
}

initReset();

/*
    Update Object should be: { type: [player/team/compare], data: {

    }}

    playerData: {
            number: 0,
            firstName: "",
            lastName: "",
            height: "",
            position: "",
            hometown: "",
            year: "",
            game: {},
            season: {}
    }

    location:
    teamData: {
        tricode: "",
        school: "",
        name: "",
        logo: "",
        primaryColor:"",
        secondaryColor:"",
    }

    compareData: {
        code: "",
        category: "",
        away: "",
        home: ""
    }
*/

function processPushData(pushData) {
    if (!Array.isArray(pushData)) pushData = [pushData];
    _.each(pushData, data => {
        switch (data.type) {
            case "team":
                addEditTeam(data.data, data.location);
                break;
            case "player":
                addEditPlayer(data.data);
                break;
            case "compare":
                changeCompare(data.data);
                break;
        }
    });
}

module.exports = {
    processData(data = undefined) {
        if (!!data) processPushData(data);
        return { complete: true };
    },
    resetGame(payload) {
        initReset(payload.home, payload.away);
        if (!!payload.data) processPushData(payload.data);
        return { message: 'Game Has Been Reset!'};
    },
    getCompare() {
        return compare;
    },
    getData() {
        return teams;
    }
}

