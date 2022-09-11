const mongoose = require('mongoose');

const CONNECT_DB = 'mongodb://localhost:27017/voudemoto'

const uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/voudemoto?' +
    'replicaSet=rs';

mongoose.connect(CONNECT_DB)
    .then(() => {
        console.log('DB is up!')
    })
    .catch((err) => {
        console.error(err.message)
    })
