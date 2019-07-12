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

See [More](https://github.com/janis-commerce/query-builder/blob/master/docs/Fields.md)

### Special Functions

It's posible add special functions in the queries, as a *key* in `parametres` object.

See [More](https://github.com/janis-commerce/query-builder/blob/master/docs/Special-functions.md)

### Joins

To join tables, use `joins` as *key*.

See [More](https://github.com/janis-commerce/query-builder/blob/master/docs/Joins.md)

### Filters

To filter by fields, use `filters` as *key*.

See [More](https://github.com/janis-commerce/query-builder/blob/master/docs/Filters.md)

### Order

To order, use `order` *key*.

See [More](https://github.com/janis-commerce/query-builder/blob/master/docs/Orders.md)

### Pagination

To use pagination, use `limit` and `page` *keys*.

See [More](https://github.com/janis-commerce/query-builder/blob/master/docs/Pagination.md)

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

If you want an example using **MySQL**. [See Here](https://github.com/janis-commerce/query-builder/blob/master/docs/MySQL.md)

```javascript
const QueryBuilder = require('@janniscommerce/query-builder');

// knex is already with init config
// model is an instance of a Model Class

const queryBuilder = new QueryBuilder(knex, model);

// Insert Items
// item an object with valid fields 
// Could be multiple items
await queryBuilder.insert(item);

// Save item which could already exist
await queryBuilder.save(item)

// Update any Items
// values, object whit fields to change
// filters, object with the correct filters
await queryBuilder.update(values, filters);

// Remove any Items
// joins, object with table joins define if it's possible
await queryBuilder.remove(filters, joins);

// Get Items
// Get All
const resultsAll = await queryBuilder.get();

// Get with options
// params, object with the options define
const results = await queryBuilder.get(params);

```