const sockets = [];
let io;
const _ = require('lodash');


module.exports = {
    connect(listener) {
        io = require('socket.io')(listener, {
            cors: {
                origin: "http://cactusfantasy.com",
                methods: ["GET", "POST"],
            }
        });
        io.on('connection', socket => {
          sockets.push(socket);
          socket.on('disconnect', s => {
              const index = _.findIndex(sockets, x => x.id === socket.id);
              sockets.splice(index, 1);
          })
        });
    },
    allSockets() {
        return {sockets};
    },
    emit(command, data) {
        _.each(sockets, socket => {
            console.log('emit');
            socket.emit(command, data);
        })
    }
}