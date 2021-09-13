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
            console.log((new Date).getSeconds());
            return (new Date).getMinutes();
        }),
        rx.distinctUntilChanged()
    )
    .subscribe(x => {
        console.log('Minute: ', x);
        const now = new Date();
        const az = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));

        const diff = now.getTime() - az.getTime();

        const d = new Date(now.getTime() - diff);
        const dow = d.getDay();
        const hour = d.getHours();
        const minute = d.getMinutes();
        console.log('Minute: ', dow, hour, minute);
        const event = _.filter(schedule, x => {
            return (_.includes(x.dow, dow) && x.hour === hour && x.minute === minute);
        });
        if (!!event.length) {
            console.log('Event to fire: ', event[0].command);
            commands[event[0].command]();
        }
    });