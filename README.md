# Query Builder

[![Build Status](https://travis-ci.org/janis-commerce/query-builder.svg?branch=master)](https://travis-ci.org/janis-commerce/query-builder)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/query-builder/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/query-builder?branch=master)

Prepare and execute SELECT Query in a SQL database.

## Instalation

```
npm install @janiscommerce/query-builder
```

## API

* `new QueryBuilder(knex, model, parametres)`

    Query Builder constructor.

    - `knex`, [Knex module](https://knexjs.org/) with the initial configuration.
    - `model` Microservice Model
    - `parametres` Parametres for the query.

* `build()` 

    Build the query using the params and the model.

* `execute()`

    Execute the Query. Needs to be **Build** first.
    
    Returns a `Promise` with the results of execution in the database.

## Select All fields

If `parametres` is an empty object in the constructor the query will be

```
select `t`.* from `table` as `t`
```

## Specific Fields

If you want to return a specficic field in the query, you must define de *key* **fields** in the constructor as ´parametres´.

**Fields** must be an array of *strings*.

If some field are not define in the structure will be ignore. If all fields are ignored will be like no have any.

```javascript
const params = {
    fields: ['some','field','other']
}
```

If `fields` is `false`, is like select all fields.

## Special Functions

It's posible add special functions in the queries.

|Function	|SQL Operator	| Description |
|-----|---------------------|-------------|
|count		|COUNT()        |Counts the registries   |
|min		|MIN() 			|Get the minimum registry   |
|max		|MAX() 		    |Get the maximum registry   |
|sum		|SUM() 			|Calculate the sum of the registries  |
|avg		|AVG 	        |Calculate the average of the registries   |


## Errors

## Usage

Some examples.

```javascript
const QueryBuilder = require('@janniscommerce/query-builder');

// knex - an Knex Initialize function with proper database config
/* 
    someModel - Model of 'some' microservice
    with
    static get table() {
        return 'table_some'
    }
*/

const queryBuilder = new QueryBuilder(knex, someModel);
// build the query
queryBuilder.build(); // select `t`.* from `table_some` as `t
// Execute the Query
const results = await queryBuilder.execute();

```

With Parametres

```javascript
const QueryBuilder = require('@janniscommerce/query-builder');

// knex - an Knex Initialize function with proper database config
/* 
    someModel - Model of 'some' microservice
    with
    static get table() {
        return 'table_some'
    }

    static get fields() {
        return {
            foo: true,
            bar: true
        }
    }
*/

const params = {
    fields: ['foo','bar']
}
const queryBuilder = new QueryBuilder(knex, someModel,params);
// build the query
queryBuilder.build(); // select `t`.`foo`, `t`.`bar` from `table_some` as `t
// Execute the Query
const results = await queryBuilder.execute();

```

With Special Functions

```javascript
const QueryBuilder = require('@janniscommerce/query-builder');

// knex - an Knex Initialize function with proper database config
/* 
    someModel - Model of 'some' microservice
    with
    static get table() {
        return 'table_some'
    }

    static get fields() {
        return {
            foo: true,
            bar: true
        }
    }
*/

const params = {
    count: true
}
const queryBuilder = new QueryBuilder(knex, someModel,params);
// build the query
queryBuilder.build(); // select count(*) from `table_some` as `t
// Execute the Query
const results = await queryBuilder.execute();

// With a single field

const params = {
    count: 'foo'
}
const queryBuilder2 = new QueryBuilder(knex, someModel,params);
// build the query
queryBuilder2.build(); // select count(`t.foo`) from `table_some` as `t
// Execute the Query
const results = await queryBuilder2.execute();

```