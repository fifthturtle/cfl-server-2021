const sockets = [];
let io;
const _ = require('lodash');
const cflapi = require("./cflapi.js");
const mongo = require('./cflmongo');
const { currentWeek } = require('./general');

async function sendWaivers(socket, team) {
    const week = await currentWeek();
    const settings = _.find((await cflapi.settings()).weeks, x => x.num === week);
    const round = settings.moves.length;
    const data =  _.chain(settings.waivers[round])
                        .filter(x => x.team === team && !!x.active)
                        .sortBy('order')
                        .value();
    socket.emit('team-waivers', data);
}

function connect(socket) {
    sockets.push(socket);
    socket.on('disconnect', s => {
        const index = _.findIndex(sockets, x => x.id === socket.id);
        sockets.splice(index, 1);
    });
    socket.on('login', async data => {
      const owner = await cflapi.login(data.owner_id, data.password);
      if (!!owner.length) {
          socket.emit('login-good', owner[0]);
          sendWaivers(socket, owner[0].team);
      } else {
          socket.emit('login-bad');
      }
    });
    socket.on('waiver-claim', async waiver => {
        const week = await currentWeek();
        const settings = _.find((await cflapi.settings()).weeks, x => x.num === week);
        const moves = settings.moves;
        const waivers = settings.waivers;
        const round = moves.length;
        const team = _.filter(waivers[round], x => x.team === waiver.team && !!x.active);
        waiver.time = Date.now();
        waiver.order = team.length + 1;
        waiver.active = true;
        waiver.changes = [];
        waivers[round].push(waiver);
        const set = {};
        set[`weeks.${week-1}.waivers.${round}`] = waivers[round];
        await mongo.update('settings', { query: {}, set });
        console.log('waiver', waiver);
        console.log('settings', settings);
        sendWaivers(socket, waiver.team);
    });

    socket.on('update-waivers', async data => {
        console.log('changes', data);
        const time = Date.now();
        const week = await currentWeek();
        const settings = _.find((await cflapi.settings()).weeks, x => x.num === week);
        const moves = settings.moves;
        const waivers = settings.waivers;
        const round = moves.length;
        _.each(data.changes, async waiver => {
            const db = _.find(waivers[round], x => x.time === waiver._id);
            waiver.change.time = time;
            db.changes.push(waiver.change);
            const query = { year: 2021 };
            query[`weeks.${week-1}.waivers.${round}.time`] = waiver._id;
            const set = {};
            if (waiver.change.type === 'move-waiver') {
                set[`weeks.${week-1}.waivers.${round}.$.order`] = waiver.change.to;
            }
            if (waiver.change.type === 'delete-waiver') {
                set[`weeks.${week-1}.waivers.${round}.$.active`] = false;
            }
            set[`weeks.${week-1}.waivers.${round}.$.changes`] = db.changes;
            mongo.update('settings', { query, set });
        });
    });

    socket.on('refresh-waivers', data => {
        sendWaivers(socket, data.team);
    })
  }


module.exports = {
    connect(listener) {
        io = require('socket.io')(listener, {
            cors: {
                origin: ["http://cactusfantasy.com", "http://localhost:4200"],
                methods: ["GET", "POST"],
            }
        });
        io.on('connection', connect);
    },
    allSockets() {
        return {sockets};
    },
    emit(command, data = {}) {
        _.each(sockets, socket => {
            socket.emit(command, data);
        })
    }
}