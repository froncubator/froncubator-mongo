# froncubator-mongo
MongoDB library with typing and schema-models.
https://github.com/froncubator/froncubator-mongo

### Installation and Usage
```sh
npm install froncubator-mongo
```

### Quick Start
```javascript
const FroncubatorMongo = require('froncubator-mongo')

async function main() {
    // Init library
    const db = new FroncubatorMongo()

    // Connect to MongoDB
    await db.connect('mongodb://user:password@ip_address:mongo_port/db_name', 'db_name')

    // Create schema with default values.
    // These values are used in the library for type checking.
    db.models.user = function() {
        return {
            firstName: '', // default values
            lastName: '',
            age: 0,
            interests: []
        }
    }

    // Allmost all FroncubatorMongo methods return {promise}
    await db.insert('user', {
        firstName: 'Jack',
        lastName: 'Black',
        age: 24,
        interests: ['beer', 'develop like a beast ;)', 'sleep']
    })
}

// ...
main()
```

### Create Document
```javascript
// create model-schema
db.models.post = function() {
    return {
        title: '',
        text: ''
    }
}

try {
    // Creating data. Return default response from mongodb driver
    // "result" Contains the result document from MongoDB
    // "ops" Contains the documents inserted with added _id fields
    // "connection" Contains the connection used to perform the insert
    let newPost = await db.insert('post', {
        title: 'Hello',
        text: 'World'
    })

    // Creating data with wrong type field.
    await db.insert('post', {
        title: 'Hello',
        text: 100
    })

    // You can use promise if you want, but
    // We recommend async/await way!
    db.insert('post', {
        title: 'Hello',
        text: 100
    }).then(
        data => {
            console.log(data)
        },
        error => [
            console.log(error)
        ]
    )

} catch(err) {
    console.log(err)
    // output
    //     type: 'insertValidateError',
    //     field: invalidKey,
    //     message: 'Error in collection - post. Field - text incorrect or type field is invalid.'
}
```
> Insert and Update methods return "reject" if field has wrong type or not exist in "db.models"

### Find Document
```javascript
let posts = await db.find('post', { title: 'Hello' })
// output: [{ _id: *****, title: 'Hello', text: 'World' }]

let posts = await db.find('post',
    { title: 'Hello' }, // query param
    {  // options
        fields: { // include|exclude fields
            title: 1,
            text: 0
        },
        limit: 10, // limit data
        sort: : { title: 1 } // sort by field
    }, {
        cursor: true // and you can return 'cursor' instead [array]
        // or you can get 'count' of documents found
        // count: true
    })
```
> You can use all query params and options from official docs http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find

### Update Document
```javascript
// ... model-shema
await db.updateOne('post', { title: 'Hello' }, { $set: { text: 'Bro!' } })
await db.updateMany('post', { title: 'Hello' }, { $set: { text: 'Bro!' } })
// return reject if value has wrong type or not exist
```

> You can use all features of mongodb. http://mongodb.github.io/node-mongodb-native/3.0/quick-start/quick-start/

### Delete Documents
```javascript
await db.deleteOne('post', { title: 'Hello' })
await db.deleteMany('post', { title: 'Hello' })
// return true/false or promise reject
```

### Drop Collection
```javascript
await db.dropCollection('post')
// return true/false or promise reject
```

### Drop Indexes
```javascript
await db.dropIndex('post') // drop all indexes from post collection
// return true/false or promise reject
```

### Connect
```javascript
await db.connect('some_mongo_url') // connect to DB
// return db object (by mongodb driver)
// if FroncubatorMongo lost connection, then module start "auto reconnect" after 5 seconds
```

### Create ObjectID
```javascript
db.toObjectID('59d10a3d320d720010522391')
// or you can send array and toObjectID will return ObjectID[]
db.toObjectID(['59d10a3d320d720010522391', '59d10a3d320d720010522391'])
```

### Disconnect
```javascript
await db.disconnect() // close db connection.
// return true/false or promise reject
```

### Some features
> Create instance of the class with additional params.
```javascript
    const db = new FroncubatorMongo({
        // Add default query part. When you create new document, hide param will be added to your document by default with 0 value.
        // $ne param would be added to db.find by default
        defaultQueryPart: {
            hide: 0,
            $ne: 1
        }
    })
```
> Execution time request in db.find()
```javascript
    // Change MaxTimeMS (default: 90000 ms)
    db.maxTimeMS = 10000
```
> add own db connection and add to FroncubatorMongo
```javascript
    const FroncubatorMongo = require('froncubator-mongo');
    let db = null;
    const MongoClient = require('mongodb').MongoClient;
    // Connection URL
    const url = 'mongodb://localhost:27017';
    // Database Name
    const dbName = 'myproject';

    let fMongo = new FroncubatorMongo()

    // Use connect method to connect to the server
    MongoClient.connect(url, function(err, client) {
        db = client.db(dbName);
        fMongo.db = db // set db param from native driver
    });
```

> Tested in Node.js v8+ and use async/await pattern.
> By Froncubator Pro

[MIT license](https://github.com/froncubator/froncubator-mongo/blob/master/LICENSE)