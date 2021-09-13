// jshint esversion:6

const assert = require('assert');
const fs = require('fs-extra');
let players = {};

const dbName = 'cf2021';
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://jdefamio:Edmond237@cluster0-mmyga.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
    useNewUrlParser: true
});
client.connect(err => {
    assert.equal(err, null);
    console.log("Successful DB Connection!");
    players = find('players');
    //console.log("POST-CONNECT", client.isConnected());
    console.log(__dirname);
})


const find = (collection, data = {}) => {
    let query = data.query || {};
    let sort = data.sort || {};
    let fields = data.fields || {};
    return new Promise((resolve, reject) => {
        let db = client.db(dbName);
        db.collection(collection).find(query, {
            fields
        }).sort(sort).toArray((err, items) => {
            if (err) {
                reject(err);
            } else {
                resolve(items);
            }
        });
    });
}

module.exports = {
    players,
    find,
    findOne(collection, data = {}) {
        let query = data.query || {};
        let fields = data.fields || {};
        return new Promise((resolve, reject) => {
            let db = client.db(dbName);
            db.collection(collection).find(query, {
                fields
            }).toArray((err, items) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(items);
                }
            });
        });
    },
    insertOne(collection, data) {
        let db = client.db(dbName);
        db.collection(collection).insertOne(data);
    },
    inesertMany(collection, data) {
        let db = client.db(dbName);
        db.collection(collection).insertMany(data);
    },
    update(collection, data) {
        if (!data.set) return;
        if (!data.query) return;
        let db = client.db(dbName);
        db.collection(collection).updateOne(data.query, {
                $set: data.set
            })
            .then(res => {})
            .catch(err => {})
    },
    addToArray(collection, data) {
        if (!data.addToSet) return;
        if (!data.query) return;
        let db = client.db(dbName);
        db.collection(collection).updateOne(data.query, {
                $addToSet: data.addToSet
            })
            .then(res => {})
            .catch(err => {})
    },
    updateMany(collection, data) {
        if (!data.set) return;
        if (!data.query) data.query = {};
        let db = client.db(dbName);
        db.collection(collection).updateMany(data.query, {
                $set: data.set
            })
            .then(res => {})
            .catch(err => {})
    },
    popFromArray(collection, data) {
        if (!data.pop) return;
        if (!data.query) data.query = {};
        let db = client.db(dbName);
        db.collection(collection).update(data.query, {
            $pop: data.pop
        }).then(res => {}).catch(err => {});
    }
}