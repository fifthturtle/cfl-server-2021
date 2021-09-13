const rx = require('rxjs');
const _ = require('lodash');
const { owners } = require('./cflapi');
const { updatePlayers } = require('./setup');

const commands = {
    updatePlayers: function() {
        updatePlayers();
        console.log('update players fired!');
    }
}

const timer = rx.timer(0, 1000);

const schedule = [
    {
        dow: [0,1,2,3,4,5,6],
        hour: 21,
        minute: 30,
        command: 'updatePlayers'
    }
]

timer
    .pipe(
        rx.map(x => {
            const d = new Date;
            console.log(d.getHours(), d.getSeconds());
            return d.getMinutes();
        }),
        rx.distinctUntilChanged()
    )
    .subscribe(x => {
        const d = new Date;
        const dow = d.getDay();
        const hour = d.getHours();
        const minute = d.getMinutes();
        const event = _.filter(schedule, x => {
            return (_.includes(x.dow, dow) && x.hour === hour && x.minute === minute);
        });
        if (!!event.length) {
            console.log('Event to fire: ', event[0].command);
            commands[event[0].command]();
        }
    });