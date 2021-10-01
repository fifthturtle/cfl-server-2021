const {BehaviorSubject} = require('rxjs');

const schedule$ = new BehaviorSubject('');
const commands = {
    MOVES: 1,
    LIVESCORING: 2,
    UPDATEPLAYERS: 3,
    COMPLETEWEEK: 4,
    MOVESANDLIVESCORING: 5,
    STOPSCORING: 6,
}

module.exports = {
    schedule$,
    commands
}
