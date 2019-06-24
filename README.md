# query-builder

[![Build Status](https://travis-ci.org/janis-commerce/query-builder.svg?JCN-70-query-builder)](https://travis-ci.org/janis-commerce/query-builder)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/query-builder/badge.svg?branch=JCN-70-query-builder)](https://coveralls.io/github/janis-commerce/query-builder?branch=JCN-70-query-builder)

Prepare and execute SELECT, INSERT, UPDATE, REMOVE queries from SQL database.

- - -

## Instalation

```
npm install @janiscommerce/query-builder
```

- - -

## Configuration

You must have installed both `Knex` and `SQL` driver you will use and tables created.

- - -

## API

* `new QueryBuilder(knex, models)`, Query Builder constructor.

    - `knex`, [Knex module](https://knexjs.org/) with the initial configuration.
    - `model` Model instance. The Model must have table, field, joins, etc. structure define. [See more](https://github.com/janis-commerce/model-controller)

* `insert(items)` **ASYNCHRONOUS**, Execute *INSERT* Query.

    - `items` - Object to Insert or Array of Objects to Insert.
    - **Returns**, an `array`, depends on SQL-Database you will use [See More Details](https://knexjs.org/#Builder-insert).

* `save(items)` **ASYNCHRONOUS**, Execute *INSERT* Query with *Upsert* (Updated de duplicate rows, and insert the new ones).
    
    - `items` - Object to Insert or Array of Objects to Insert.
    - **Returns**, `object` depends on SQL-Database-Druver you will use.

* `update(values, filters)` **ASYNCHRONOUS**, Execute *UPDATE* Query.

    - `values` will be updated to.
    - `filters` (where clause) conditions to filter rows. See **Filters**.
    - **Returns**, `number` of rows updated.

* `remove(filters, joins)` **ASYNCHRONOUS**, Execute *REMOVE* Query.

    - `filters` (where clause) conditions to filter rows. See **Filters**.
    - `joins` if you need to joins table. See **Joins**.
    - **Returns**, `object` depends on SQL-Database-Druver you will use.

* `get( parametres )` **ASYNCHRONOUS**, Execute *SELECT* Query.

    - `parametres` , type `object`, Parametres for the query, filters, joins, limits.
    - **Returns**, `array` with the rows founds.

- - -

## Parametres

### Field

To select a specific field, use `fields` as *key* with the selected fields.

See [More](https://github.com/janis-commerce/query-builder/docs/Fields.md)

### Special Functions

It's posible add special functions in the queries, as a *key* in `parametres` object.

See [More](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)

### Joins

To join tables, use `joins` as *key*.

See [More](https://github.com/janis-commerce/query-builder/docs/Joins.md)

### Filters

To filter by fields, use `filters` as *key*.

See [More](https://github.com/janis-commerce/query-builder/docs/Filters.md)

### Order

To order, use `order` *key*.

See [More](https://github.com/janis-commerce/query-builder/docs/Orders.md)

### Pagination

To use pagination, use `limit` and `page` *keys*.

See [More](https://github.com/janis-commerce/query-builder/docs/Pagination.md)

- - -

## Errors

The errors are informed with a `QueryBuilderError` with the proper message for each error.

The codes are the following:

|Code	|Description				|
|-------|---------------------------|
|1		|Invalid Model  			|
|2		|Invalid Knex 				|
|3		|Invalid Fields     		|
|4		|Invalid Select Functions   |
|5		|Invalid Joins	            |
|6      |Invalid Filters            |
|7      |Invalid Flags              |
|8      |Invalid Orders             |
|9      |Invalid Groups             |
|10     |Invalid Limits             |
|11     |Invalid Table              |
|12     |No Items                   |
|13     |No Values                  |
|14     |Nothing Select             |

- - -

## Usage

Example, using **MySQL** database.

First Installed the packages.

```sh
npm i @janniscomerce/query-builder knex mysql2 --save
```

In the `.js` file: 

```javascript
const QueryBuilder = require('@janniscommerce/query-builder');

/*
    'SomeModel' is a Model extension with properties:

    - Db Name   :   'fizzmod'
    - Table     :   'fake_table' 
    - Fields    :   * 'id', type: int
                    * 'name', type: string  
*/
const someModel = new SomeModel();

// Initialize Knex with Database configuration
// Tables are already created with PRIMARY KEY ID

const config = {
    host: 'localhost',
    user: 'fizzRoot',
    password: '20191806',
    database: 'fizzmod',
    port: 3306
};

const knex = require('knex')({
	client: 'mysql2',
	version: '1.5.2',
	connection: config,
	pool: { min: 0, max: config.connectionLimit }
}).on('query-error', error => {
	console.error('ERROR');
});

// Initialize Query Builder

const modelQueryBuilder = new QueryBuilder(knex, someModel);

// INSERT One New Item

let item = {
    id: 1,
    name: 'Batman',
    extra: 'No valido' // Will not be inserted
};

/* 
    response if correct: [0]
    if PRIMARY KEY exists will throw an Error
*/

const insertItem = await modelQueryBuilder.insert(item); 

item = {
    id: 2,
    name: 'MAL'
};

insertItem = await modelQueryBuilder.insert(item); 

// INSERT Multiple New Items

let items = [
    { id: 3, name: 'Ironman' },
    { id: 4, name: 'Spiderman' },
    { id: 5, name: 'Green Lantern' }
];

insertItems = await modelQueryBuilder.insert(items);

/* 
    response if correct: [0]
    if PRIMARY KEY exists will throw an Error
*/

// SAVE: INSERT with UPSERT, if the PRIMARY KEY exist will be update the row

item = {
    id: 2,
    name: 'Robin'
};

/*
    Response:
    [   
        {
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            info: 'Records: 1, Duplicates: 1, Warning: 0',
            serverStatus:2,
            warningStatus: 0
        },
        undefined
    ]
*/

const saveItem = await modelQueryBuilder.save(item); 

items = [
    { id: 6, name: 'Ironman' },
    { id: 7, name: 'Spiderman' },
    { id: 2, name: 'Superman' },
    { id: 8, name: 'Some DC character'},
    { id: 9, name: 'Some DC character'},
    { id: 10, name: 'Some DC character'},
];

const saveItems = await modelQueryBuilder.save(items);

/*
    Response:
    [   
        {
            fieldCount: 0,
            affectedRows: 3,
            insertId: 0,
            info: 'Records: 3, Duplicates: 1, Warning: 0',
            serverStatus:2,
            warningStatus: 0
        },
        undefined
    ]
*/

// UPDATE
// Try to Update one Item
let valueToUpdate = {
    name: 'John Constantine'
};

let filters = {
    id: { value: 8 }
};

// Will try to update rows with ID equals to 8, and change name for 'Jonh Constantine'
const updatedItems = await modelQueryBuilder.update(valueToUpdate, filters);
/*
    Response: 1
*/


// Try to Update many items that not exist.
valueToUpdate = {
    name: 'SkyWalker'
};

filters = {
    id: { value: 100, type: 'greater' }
};

// Will try to update rows with ID greater than 100 and change name for 'SkyWalker'
updatedItems = await modelQueryBuilder.update(valueToUpdate, filters);
/*
    Response: ''
*/

//Try to update many items
valueToUpdate = {
    name: 'Some DC Villain'
};

filters = {
    id: { value: 8, type: 'greater' }
};

// Will try to update rows with ID greater than 8 and change name for 'Some DC Villain'
updatedItems = await modelQueryBuilder.update(valueToUpdate, filters);
/*
    Response: 2
*/

// REMOVE
filters = {
    id: { value: 10 }
}

// Remove all items that ID is equal to 10
const removeItems = await modelQueryBuilder.remove(filters);
/*
    Response:
    [   
        {
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            info: '',
            serverStatus:2,
            warningStatus: 0
        },
        undefined
    ]
*/

// GET

// Get all Items and every Field saved.
let results = await modelQueryBuilder.get();
/*
    Response: 
    [
        { id: 1, name 'Batman' },
        { id: 2, name 'Superman' },
        { id: 3, name: 'Ironman' },
        { id: 4, name: 'Spiderman' },
        { id: 5, name: 'Green Lantern' },
        { id: 6, name: 'Ironman' },
        { id: 7, name: 'Spiderman' },
        { id: 8, name: 'John Constatine'},
        { id: 9, name: 'Some DC Villain'}
    ]
*/

// Get all Items and one Field saved.

let params = {
    fields : ['name']
}

let results = await modelQueryBuilder.get(params);
/*
    Response: 
    [
        { name 'Batman' },
        { name 'Superman' },
        { name: 'Ironman' },
        { name: 'Spiderman' },
        { name: 'Green Lantern' },
        { name: 'Ironman' },
        { name: 'Spiderman' },
        { name: 'John Constatine'},
        { name: 'Some DC Villain'}
    ]
*/

// Get all Items and one Field saved.

params = {
    fields : ['name']
}

results = await modelQueryBuilder.get(params);
/*
    Response: 
    [
        { name 'Batman' },
        { name 'Superman' },
        { name: 'Ironman' },
        { name: 'Spiderman' },
        { name: 'Green Lantern' },
        { name: 'Ironman' },
        { name: 'Spiderman' },
        { name: 'John Constatine'},
        { name: 'Some DC Villain'}
    ]
*/

// Get the count of items.

params = {
    fields : ['name'],
    count: true
}

results = await modelQueryBuilder.get(params);
/*
    Response: 
    [
        { name 'Batman', count: 9 }
    ]
*/

// Get with filters

params = {
    fields : ['name'],
    filters : {
        id: { value: 5, type: 'lesser' }
    }
}

results = await modelQueryBuilder.get(params);
/*
    Response: 
    [
        { name 'Batman' },
        { name 'Superman' },
        { name: 'Ironman' },
        { name: 'Spiderman' }
    ]
*/

// Get with Limit

params = {
    fields : ['name'],
    limit: 4
}

results = await modelQueryBuilder.get(params);
/*
    Response: 
    [
        { name 'Batman' },
        { name 'Superman' },
        { name: 'Ironman' },
        { name: 'Spiderman' }
    ]
*/

// Get with Limit and Page

params = {
    fields : ['name'],
    limit: 4,
    page: 2
}

results = await modelQueryBuilder.get(params);
/*
    Response: 
    [
        { name: 'Green Lantern' },
        { name: 'Ironman' },
        { name: 'Spiderman' },
        { name: 'John Constatine'}
    ]
*/

```