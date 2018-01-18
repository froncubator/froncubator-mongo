# froncubator-mongo
MongoDB library with typing and schema-models.
https://github.com/froncubator/froncubator-mongo

## Installation and Usage
npm install froncubator-mongo

```javascript
// Quick Start
async main() {
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

    // All FroncubatorMongo methods return {promise}
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

[MIT license](https://github.com/froncubator/froncubator-mongo/blob/master/LICENSE).