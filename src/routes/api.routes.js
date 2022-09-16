const express = require('express')
const mongoose = require('mongoose')

const router = express.Router()

const User = require('../models/user')
const Motoboy = require('../models/motoboy')
const Payment = require('../models/payment')
const Ride = require('../models/ride')

const googleMaps = require('../services/googleMaps')

router.post('/signup', async (req, res) => {

    const db = mongoose.connection
    const session = await db.startSession()
    // session.startTransaction()

    try {
        const { user, motoboy, payment } = req.body
        let finalUser = {}

        if (user.tipo === 'M') {
            // cadastrar motorista
            finalUser = await new User({
                ...user
            }).save({ session })

            // cadastrar veiculo
            await new Motoboy({
                ...motoboy,
                userId: finalUser._id
            }).save({ session })

            // cadastrar metodo pagamento
            await new Payment({
                ...payment,
                userId: finalUser._id
            }).save({ session })

        } else {
            // cadastrar passageiro
            finalUser = await new User({
                ...user
            }).save({ session })
        }

        // await session.commitTransaction()
        session.endSession()

        res.json({ error: false, finalUser })

    } catch (error) {
        // await session.abortTransaction()
        session.endSession()

        res.json({ error: true, message: error.message })
    }
})

router.post('/check-user', async (req, res) => {
    try {
        const user = await User.findOne({
            email: req.body.email
        })

        res.json({ error: false, user })
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})

router.put('/location/:id', async (req, res) => {
    try {

        const { id } = req.params
        const { coordinates } = req.body

        await User.findByIdAndUpdate(id, {
            location: {
                type: 'Point',
                coordinates
            }
        })

        res.json({ error: false })
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})

router.put('/socket/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { socketId } = req.body

        await User.findByIdAndUpdate(id, {
            socketId,
        })

        res.json({ error: false })
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})

router.get('/address/:address', async (req, res) => {
    try {
        const list = await googleMaps.getPlaces(
            encodeURIComponent(req.params.address)
        )

        if (list.error) {
            throw list.message
        }

        const addressList = list.data.predictions.map((addr) => {
            const {
                place_id,
                description,
                structured_formatting: { secondary_text }
            } = addr

            return {
                place_id,
                description,
                secondary_text
            }
        })

        res.json({ error: false, list: addressList })
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})

router.post('/pre-ride', async (req, res) => {
    try {
        const { origin, destiny } = req.body
        const routerRequest = await googleMaps.getRoute(origin, destiny)

        if (routerRequest.error) {
            throw routerRequest.message
        }

        const {
            distance,
            duration,
            start_address,
            end_address,
            steps
        } = routerRequest.data.routes[0].legs[0]

        const route = steps.map((step) => {
            return [
                {
                    latitude: step.start_location.lat,
                    longitude: step.start_location.lng,
                },
                {
                    latitude: step.end_location.lat,
                    longitude: step.end_location.lng,
                }
            ]
        }).flat(1)

        const price = ((distance.value / 1000) * 2.67).toFixed(2)

        res.json({
            error: false,
            info: {
                price,
                distance,
                duration,
                start_address,
                end_address,
                route
            }

        })
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})

router.post('/call-ride', async (req, res) => {
    try {
        const { io } = req.app
        const { info, userId } = req.body

        //ler o dados do passageiro
        const user = await User.findById(userId).select('_id nome gId sockeId email')

        const drivers = await User.aggregate([
            //todos no raio de 5km
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [info.route[0].latitude, info.route[0].longitude]
                    },
                    distanceField: 'location',
                    spherical: true,
                    // maxDistance: 5 * 1000 //5km
                }
            },
            //achar todos os motoristas
            { $match: { tipo: 'M' } },
            //todos motoristas que nao estao em corrida lookup é um JOIN
            {
                $lookup: {
                    from: 'rides',
                    as: 'activeRides',
                    let: {
                        driverId: '$_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$driverId', '$$driverId']
                                        },
                                        {
                                            $eq: ['$status', 'A']
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            },
            //remover os motoristas que estao em corrida
            {
                $match: {
                    'activeRides.driverId': {
                        $exists: false,
                    }
                }
            }
        ])

        if (drivers.length) {
            drivers.map(driver => {
                io.sockets.sockets.get(driver.socketId).emit('ride-request', { info: { user: user, ride: info } })
            })

            res.json({ error: false, info: { user: user, ride: info } })
        } else {
            res.json({ error: true, message: 'Nenhum motorista disponivel no momento' })
        }
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})

router.post('/accept-ride', async (req, res) => {
    try {
        const { io } = req.app
        const { info, userId, driverId } = req.body

        const rideId = mongoose.Types.ObjectId

        //dados de pagamento

        //dados do motorista
        const driver = await User.findById(driverId).select('_id gId nome')
        console.log('dados do driver => ', driver)

        //dados do veiculo 
        const motocycle = await Motoboy.findOne({
            userId: driverId
        }).select('placa marca modelo cor')
        console.log('dados do veiculo => ', motocycle)

        //sockets
        let usersSocket = await User.find({
            $or: [
                { _id: mongoose.Types.ObjectId(userId) },
                { _id: mongoose.Types.ObjectId(driverId) },
            ]
        }).select('_id socketId')

        usersSocket = usersSocket.map(user => user.socketId)


        //criar pagamento

        //criar registro da corrida no BD
        const ride = await new Ride({
            id: rideId,
            userId: userId,
            driverId: driverId,
            info: info,
        }).save()

        //colocar os users em uma room
        usersSocket.map((socketId) => {
            // io.sockets.sockets.get(socketId).join(rideId)
        })

        //emitir a corrida aceita com os dados
        const finalData = {
            _id: rideId,
            userId: userId,
            infoDriver: driver,
            infoMotocycle: motocycle,
            infoRide: info,
        }

        io.to(rideId).emit('ride', finalData)
        res.json({ error: false, ride: finalData })
    } catch (err) {
        res.json({ error: true, message: err.message })
    }
})


module.exports = router