const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ride = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    driverId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    info: {
        type: Object,
        required: true,
    },
    status: {
        type: String,
        enum: ['A', 'C', 'F'], // Active, Canceled, Finished
        default: 'A',
    },
    dataCadastro: { type: String, default: Date.now() },
});

module.exports = mongoose.model('Ride', ride);
