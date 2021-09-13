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
            const now = new Date();
            const ny = new Date(now.toLocaleString("en-US", {timeZone: "America/Phoenix"}));

            const diff = now.getTime() - ny.getTime();

            const d = new Date(now.getTime() - diff);
            //d.toLocaleString('en-US', { timeZone: 'America/New_York'});
            console.log(d.getDay(), d.getHours(), d.getMinutes(), d.getSeconds());
            return d.getMinutes();
        }),
        rx.distinctUntilChanged()
    )
    .subscribe(x => {
        console.log('Minute: ', x);
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