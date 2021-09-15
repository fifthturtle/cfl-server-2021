const fs = require('fs-extra');

const data = {
    "mongo": {
        "uri": "mongodb+srv://jdefamio:Edmond237@cluster0-mmyga.mongodb.net/test?retryWrites=true&w=majority"
    },
    "email": {
        "name": "cactusfantasy.com",
        "host": "mail.cactusfantasy.com",
        "secure": true,
        "port": 465,
        "auth": {
            "user": "cactusfantasy@cactusfantasy.com",
            "pass": "9csaSs4L=CWy"
        }
    }
}

fs.writeFileSync('./lib/data.json', JSON.stringify(data, null, 2))