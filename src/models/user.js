const mongoose = require('mongoose');
const generate = require('gerador-validador-cpf').generate;
const Schema = mongoose.Schema;

const user = new Schema({
	gId: { type: String, required: true },
	nome: { type: String, required: true },
	email: { type: String, required: true },
	cpf: {
		type: String,
		default: function () {
			return generate();
		},
	},
	tipo: { type: String, enum: ['M', 'P'], required: true },
	accessToken: { type: String, required: true },
	recipientId: {
		type: String,
		required: function () {
			this.type === 'M';
		},
	},
	location: {
		type: { type: String },
		coordinates: [],
	},
	socketId: String,
	dataCadastro: { type: String, default: Date.now() },
});

user.index({ location: '2dsphere' });

module.exports = mongoose.model('User', user);
