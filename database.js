const mongoose = require('mongoose');

const CONNECT_DB = 'mongodb://localhost:27017/voudemoto'

const uri = 'mongodb+srv://development:9mBOFGkgcNrWnq5Y@voudemoto-clusterdev.yc7ofqp.mongodb.net/voudemoto?retryWrites=true&w=majority'

mongoose.connect(CONNECT_DB)
    .then(() => {
        console.log('DB is up!')
    })
    .catch((err) => {
        console.error(err.message)
    })
