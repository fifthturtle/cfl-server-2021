const sockets = [];
let io;
const _ = require('lodash');
const cflapi = require("./cflapi.js");


module.exports = {
    connect(listener) {
        io = require('socket.io')(listener, {
            cors: {
                origin: ["htttp://cactusfantasy.com", "http://localhost:4200"],
                methods: ["GET", "POST"],
            }
        });
        io.on('connection', socket => {
          sockets.push(socket);
          socket.on('disconnect', s => {
              const index = _.findIndex(sockets, x => x.id === socket.id);
              sockets.splice(index, 1);
          });
          socket.on('login', async data => {
            const owner = await cflapi.login(data.owner_id, data.password);
            if (!!owner.length) {
                socket.emit('login-good', owner[0]);
            } else {
                socket.emit('login-bad');
            }
          })
        });
    },
    allSockets() {
        return {sockets};
    },
    emit(command, data) {
        _.each(sockets, socket => {
            socket.emit(command, data);
        })
    }
}