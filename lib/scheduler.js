const rx = require('rxjs');
const _ = require('lodash');
const { updatePlayers } = require('./setup');
// const { init } = require('./livescoring');

const commands = {
    updatePlayers: function() {
        updatePlayers();
        console.log('update players fired!');
    },
    livescoring: function() {
        require('./livescoring').init();
    }
}

const timer = rx.timer(0, 1000);

const schedule = [
    {
        dow: [0,1,3,4,5,6],
        hour: 6,
        minute: 0,
        command: 'updatePlayers'
    },
    {
        dow: [-1],
        hour: -1,
        minute: -1,
        command: 'livescoring'
    },
    {
        dow: [2],
        hour: 9,
        minute: 0,
        command: 'completeWeek'
    },
    {
        dow: [2],
        hour: 9,
        minute: 30,
        command: 'updatePlayers'
    }
]

timer
    .pipe(
        rx.map(x => {
            return (new Date).getMinutes();
        }),
        rx.distinctUntilChanged()
    )
    .subscribe(x => {
        const now = new Date();
        const az = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));

        const diff = now.getTime() - az.getTime();

        const d = new Date(now.getTime() - diff);
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

module.exports = {
    updateScoringTime(dow, hour, minute) {
        console.log(dow, hour, minute);
        const ls = _.find(schedule, x => x.command === 'livescoring');
        ls.dow = [dow];
        ls.hour = hour;
        ls.minute = minute;
    
        console.log('scheduler updated', ls, schedule);
    }
}