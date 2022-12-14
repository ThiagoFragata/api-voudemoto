const mongoose = require('mongoose');
const generate = require('gerador-validador-cpf').generate;
const Schema = mongoose.Schema;

const user = new Schema({
    gId: { type: String, required: true },
    nome: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
    cpf: {
        type: String,
        default: function () {
            return generate();
        },
    },
    tipo: { type: String, enum: ['M', 'P'], required: true },
    location: {
        type: { type: String },
        coordinates: [],
    },
    socketId: { type: String },
    dataCadastro: { type: String, default: Date.now() },
});

user.index({ location: '2dsphere' });

module.exports = mongoose.model('User', user);
