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

function getAdjustedDate(date = false) {
    const now = (!!date) ? new Date(date) : new Date();
    const az = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));

    const diff = now.getTime() - az.getTime();

    return new Date(now.getTime() - diff);
}

timer
    .pipe(
        rx.map(x => {
            return (new Date).getMinutes();
        }),
        rx.distinctUntilChanged()
    )
    .subscribe(x => {
        const d = getAdjustedDate();
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
    updateScoringTime(date = false) {
        const ls = _.find(schedule, x => x.command === 'livescoring');
        let dow = -1;
        let hour = -1;
        let minute = -1;
        if (!!date) {
            const d = getAdjustedDate(date);
            dow = d.getDay();
            hour = d.getHours();
            minute = d.getMinutes();
        }
        ls.dow = [dow];
        ls.hour = hour;
        ls.minute = minute;
    
        console.log('scheduler updated', ls, schedule);
    }
}