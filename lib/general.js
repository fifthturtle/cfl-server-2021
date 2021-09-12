// jshint esversion:8

const mongo = require('./cflmongo');

const startDate = '9/9/2021';
let cflteams = [];
let standings = [];
let nflteams = [];
let cw = 0;

async function getCurrentWeek() {
    // let s = new Date();
    // let d = new Date(s.getFullYear(), s.getMonth(), s.getDate(), s.getHours() - 8, s.getMinutes(), s.getSeconds());
    // let diffTime = (((d.getTime() - (new Date(startDate)).getTime())) / (1000 * 60 * 60 * 24));
    // let week = (diffTime <= 0) ? 0 : Math.floor(diffTime / 7);
    // if (week > 16) week = 16;
    // const res = (await mongo.find('settings'))[0].weeks[week];
    // if (!res.started) week--;
    // cw = week;
    // setTimeout(getCurrentWeek, 1000 * 60 * 10);
    let s = new Date();
    let d = new Date(s.getFullYear(), s.getMonth(), s.getDate(), s.getHours() - 8, s.getMinutes(), s.getSeconds());
    let diffTime = (((d.getTime() - (new Date(startDate)).getTime())) / (1000 * 60 * 60 * 24));
    let week = (diffTime <= 0) ? 0 : Math.floor(diffTime / 7);
    return Math.max(1, Math.min(17, week));
}


setTimeout(getCurrentWeek, 5000);

module.exports = {
    currentWeek() {
        return 1;
    },
}