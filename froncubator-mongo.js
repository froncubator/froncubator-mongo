let MongoClient = require('mongodb').MongoClient
let ObjectID = require('mongodb').ObjectID
const f = require('util').format


class FroncubatorMongo {

    constructor(params = {}) {
        this.mongoURL = ''
        this.models = {}
        this.db = null
        this.dbName = ''
        this.params = params
        this.maxTimeMS = 90000
        this.client = null

        if (this.params.defaultQueryPart === undefined) {
            this.params.defaultQueryPart = {}
        }
    }

    toObjectID(ids) {
        if (ids === undefined || !ids) {
            return ids
        }

        if (!Array.isArray(ids)) {
            ids = ObjectID(ids)
        } else {
            for (let id of ids) {
                id = ObjectID(id)
            }
        }

        return ids
    }

    connect(mongoURL, dbName) {
        return new Promise(async (resolve, reject) => {
            this.mongoURL = mongoURL
            this.dbName = dbName

            console.log('[froncubator-mongo] Connect to MongoDB...')

            try {
                this.client = await MongoClient.connect(this.mongoURL)
                this.db = this.client.db(this.dbName)
                console.log('[froncubator-mongo] Connection established')
                return resolve(this.db)
            } catch(err) {
                if (err) {
                    setTimeout(()=>{
                        console.log('[froncubator-mongo] Cant connect to DB.', err)
                        console.log('[froncubator-mongo] Restart connection to DB...')
                        this.connect(this.mongoURL)
                    }, 5000)
                } else {
                    console.log('[froncubator-mongo] Connection established')
                    return resolve(this.db)
                }
            }
        })
    }

    disconnect() {
        return new Promise(async (resolve, reject) => {
            try {
                let data = await this.client.close()
                resolve(data)
            } catch(err) {
                reject({
                    type: 'diconnectError',
                    message: err
                })
            }
        })
    }

    dropIndex(collection) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.models[collection] === undefined) {
                    return reject({
                        type: 'dropIndexCollectionError',
                        message: `Collection - ${collection} not found`
                    })
                }

                let data = await this.db.collection(collection).dropIndexes()
                resolve(data)
            } catch (err) {
                return reject({
                    type: 'dropIndexError',
                    message: err
                })
            }
        })
    }

    find(collection, query = {}, options = {}, flags = {}) {
        return new Promise((resolve, reject) => {

            if (this.models[collection] === undefined) {
                return reject({
                    type: 'dropIndexCollectionError',
                    message: `Collection - ${collection} not found`
                })
            }

            for (let key in this.params.defaultQueryPart) {
                delete this.params.defaultQueryPart[key].default
                query[key] = this.params.defaultQueryPart[key]
            }

            if (flags !== undefined && flags !== null && flags.count) {
                this.db.collection(collection).count(query, options, (err, data) => {
                    if (err) reject({
                        type: 'findCountError',
                        message: err
                    })
                    else resolve(data)
                })
            } else if (flags !== undefined && flags !== null && flags.cursor) {
                this.db.collection(collection).find(query, options, (err, data) => {
                    if (err) reject({
                        type: 'findCursorError',
                        message: err
                    })
                    else resolve(data)
                })
            } else {
                this.db.collection(collection).find(query, options).maxTimeMS(this.maxTimeMS).toArray((err, data) => {
                    if (err) reject({
                        type: 'findError',
                        message: err
                    })
                    else resolve(data)
                })
            }
        })
    }

    insert(collection, query) {
        return new Promise((resolve, reject) => {
            if (this.models[collection] === undefined) {
                return reject({
                    type: 'insertCollectionError',
                    message: `Collection - ${collection} not found`
                })
            }

            let records = []
            const model = new this.models[collection]()
            let isValid = true
            let invalidKey = ''
            let defaultKeys = []

            for (let key in this.params.defaultQueryPart) {
                defaultKeys.push(key)
            }

            if (!Array.isArray(query)) {
                query = [query]
            }

            for (let q of query) {
                if (!isValid)
                    break

                let item = {}
                for(let key in q) {
                    if (!defaultKeys.includes(key)) {
                        if (model[key] !== undefined) {
                            if (typeof model[key] !== typeof q[key]) {
                                isValid = false
                                invalidKey = key
                                break
                            } else {
                                item[key] = q[key]
                            }
                        } else {
                            isValid = false
                            invalidKey = key
                            break
                        }
                    }
                }

                item.created_at = new Date()
                for (let key in this.params.defaultQueryPart) {
                    item[key] = this.params.defaultQueryPart[key].default
                }

                records.push(item)
            }

            if (!isValid) {
                return reject({
                    type: 'insertValidateError',
                    field: invalidKey,
                    message: 'Error in collection - ' + collection + '. Field - "' + invalidKey + '" incorrect or type field is invalid.'
                })
            }

            this.db.collection(collection).insertMany(records, (err, data) => {
                if (err) return reject({
                    type: 'insertInsertManyError',
                    message: err
                })
                else return resolve(data)
            })
        })
    }

    _update(collection, query, fields, count) {
        return new Promise((resolve, reject) => {
            try {
                if (this.models[collection] === undefined) {
                    return reject({
                        type: 'updateCollectionError',
                        message: `Collection - ${collection} not found`
                    })
                }

                const model = new this.models[collection]()
                let isValid = true
                let invalidKey = ''
                let defaultKeys = ['created_at']

                for (let key in this.params.defaultQueryPart) {
                    defaultKeys.push(key)
                }

                for (let method in fields) {
                    if (method[0] === '$' && ['$inc', '$min', '$max', '$mul', '$set', '$setOnInsert'].includes(method)) {
                        for(let key in fields[method]) {
                            if (!defaultKeys.includes(key)) {
                                if (model[key] !== undefined) {
                                    if (typeof model[key] !== typeof fields[method][key]) {
                                        isValid = false
                                        invalidKey = key
                                        break
                                    }
                                } else {
                                    isValid = false
                                    invalidKey = key
                                    break
                                }
                            }
                        }
                    }
                }

                if (!isValid) {
                    return reject({
                        type: 'updateValidateError',
                        field: invalidKey,
                        message: 'Error in collection - ' + collection + '. Field - "' + invalidKey + '" incorrect or type field is invalid.'
                    })
                }

                if (count === 'one') {
                    this.db.collection(collection).updateOne(query, fields, (err, data) => {
                        if (err) return reject({
                            type: 'updateUpdateOneError',
                            message: err
                        })
                        else return resolve(data)
                    })
                } else {
                    this.db.collection(collection).updateMany(query, fields, (err, data) => {
                        if (err) return reject({
                            type: 'updateUpdateManyError',
                            message: err
                        })
                        else return resolve(data)
                    })
                }
            } catch (err) {
                if (err) return reject({
                    type: 'updateError',
                    message: err
                })
            }
        })
    }

    updateOne(collection, query, fields) {
        return new Promise(async (resolve, reject) => {
            try {
                let data = await this._update(collection, query, fields, 'one')
                resolve(data)
            } catch (err) {
                reject({
                    type: 'updateOneError',
                    message: err
                })
            }
        })
    }

    updateMany(collection, query, fields) {
        return new Promise(async (resolve, reject) => {
            try {
                let data = await this._update(collection, query, fields, 'many')
                resolve(data)
            } catch(err) {
                reject({
                    type: 'updateManyError',
                    message: err
                })
            }
        })
    }

    deleteOne(collection, query) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.models[collection] === undefined) {
                    return reject({
                        type: 'deleteOneCollectionError',
                        message: `Collection - ${collection} not found`
                    })
                }

                let data = await this.db.collection(collection).deleteOne(query)
                resolve(data)
            } catch(err) {
                return reject({
                    type: 'deleteOneError',
                    message: err
                })
            }
        })
    }

    deleteMany(collection, query) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.models[collection] === undefined) {
                    return reject({
                        type: 'deleteManyCollectionError',
                        message: `Collection - ${collection} not found`
                    })
                }

                let data = this.db.collection(collection).deleteMany(query)
                resolve(data)
            } catch(err) {
                return reject({
                    type: 'deleteManyError',
                    message: err
                })
            }
        })
    }

    dropCollection(collection) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.models[collection] === undefined) {
                    return reject({
                        type: 'dropCollectionError',
                        message: `Collection - ${collection} not found`
                    })
                }

                let data = await this.db.collection(collection).drop()
                resolve(data)
            } catch(err) {
                return reject({
                    type: 'dropError',
                    message: err
                })
            }
        })
    }
}

exports.default = FroncubatorMongo;
module.exports = exports['default'];