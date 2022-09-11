const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const payment = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tipoChave: { type: String, required: true },
    chave: { type: String, required: true },
    dataCadastro: { type: String, default: Date.now() },
});

module.exports = mongoose.model('Payment', payment);
