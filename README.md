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

You must have installed both `Knex` and `SQL` driver you will use.

- - -

## API

* `new QueryBuilder(knex, models)`

    Query Builder constructor.

    - `knex`, [Knex module](https://knexjs.org/) with the initial configuration.
    - `model` Microservice Model instance. The Model must have table, field, joins, etc. structure define. [See more](https://github.com/janis-commerce/model-controller)

* `insert(items)`
    - `items` - Object to Insert or Array of Objects to Insert.

    Execute `INSERT` Query.

    Returns a `Promise` with `[0]` if everything is OK.

* `save(items)`
    - `items` - Object to Insert or Array of Objects to Insert.

    Execute `INSERT` Query with `Upsert`.

    Returns a `Promise` with `object` if everything is OK.

* `update(values, filters)`

    Execute `UPDATE` Query.

    Returns a `Promise` with `object` if everything is OK.

* `remove(filters, joins)`

* `get( parametres )`

    - `parametres` , type `object`, Parametres for the query.

    Execute `SELECT` Query.
    
    Returns a `Promise` with the results of execution in the database.

- - -

## Parametres

`Parametres` in the constructor is an `object`. Some of the uses are:

### Select All fields

If it's empty, it select all fields in the table. By default **Query Builder** adds `t` alias to the table.

```javascript
const query = new QueryBuilder(knex,someModel,{});
query.build();
const results = await query.execute();
```

The Query is:

```sql
select `t`.* from `table` as `t`;
```

If you wants not use the default alias use a `fields` key in `false` value in `parametres`.

```javascript
const parametres = { 
    fields: false
    };

const query = new QueryBuilder(knex,someModel,parametres);
query.build();
const results = await query.execute();
```

The query is: 

```sql
select * from `table`;
```

### Specific Fields

If you want to return a specficic field in the query, you must define de *key* `fields`.

**Fields** must be an array of *strings*.

If some field are not define in the structure (model) will be ignore. If all fields are ignored will be like no have any.

```javascript
const parametres = {
    fields: ['some','field','other']
};

const query = new QueryBuilder(knex,someModel,parametres);
query.build();
const results = await query.execute();
```

The query is :

```sql
select `t`.`some`, `t`.`field`, `t`.`other` from `table` as `t`;
```

### Special Functions

It's posible add special functions in the queries, as a *key* in `parametres` object

|Function	|SQL Operator	| Description |
|-----|---------------------|-------------|
|count		|COUNT()        |Counts the registries   |
|min		|MIN() 			|Get the minimum registry   |
|max		|MAX() 		    |Get the maximum registry   |
|sum		|SUM() 			|Calculate the sum of the registries  |
|avg		|AVG 	        |Calculate the average of the registries   |

* To use in **all fields** add `true` (`boolean`) as *value*.

    ```javascript
    const parametres = {
        count: true
    };

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    
    ```

    The query is :

    ```sql
    select count(*) as `count` from `table` as `t`;
    ```
* To use in a **specific field**, add the name of field (`string`) as *value*.

    ```javascript
    const parametres = {
        avg: 'some'
    };

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select avg(`t.total`) as `avg` from `table` as `t`;
    ```

* To assign an **alias**, add an `object` with *key*-*value* : `field: [field_name]` and `alias:[alias_name]`

    ```javascript
    const parametres = {
        max: {
            field: `some`,
            alias: `maxSome`
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :
    
    ```sql
    select max(`t.some`) as `maxSome` from `table` as `t`;
    ```

### Joins

First, Fields and Join config must be define in **Model** structure.

In `parametres` object use a `joins` as *key* and `Array` of `String` with the table names as *value*

```javascript
parametres = {
    joins : ['tableB']
}
```

The query is :

```sql
select * from `table` as `t` left join `table_b` as `tb` on `t`.`some` = `tb`.`any`;
```

### Where

To filter by fields use `filters` as *key* and an `object` or an `Array` of them as *value*.

* These `object` must have key/value : `[field_name]:[expected_result]`.

    ```javascript
    const parametres = {
        filters: {
            some: 5575
        }
    };

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` = 5575);
    ```

* Multiple fields in one `object` use `AND` condition.

    ```javascript
    const parametres = {
        filters: {
            some: 5550,
            other: 1
        }
    };

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` = 5550 and `t`.`other` = 1);
    ```
* `Array` of `object` use `OR` condition.

    ```javascript
    const parametres = {
        filters: [
            { some: 5555 },
            { other: 1 }
        ]
    };

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` = 5555) or (`t`.`other` = 1);
    ```

* Combine `AND` and `OR` condition.

    ```javascript
    const parametres = {
        filters: [
            { 
                some: 555,
                field: 100
             },
            { other: 1 }
        ]
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` = 555 and `t`.`field` = 100) or (`t`.`other` = 1);
    ```

### Filters Type

Use `type` key in the `filter` object with some of these:

|Type |SQL Operator	    | Require a value | Multiple values | SQL Multiple Operator | Fixed amount of Values |
|-----|-----------------|-----------------|-----------------|-----------------------|------------------------|
|equal          | =           |Yes |Yes |IN()           |No |
|notEqual       | !=          |Yes |Yes |NOT IN()       |No |
|greater        | >           |Yes |No  |-              |1  |
|greaterOrEqual | >=          |Yes |No  |-              |1  |
|lesser         | <           |Yes |No  |-              |1  |
|lesserOrEqual  | <=          |Yes |No  |-              |1  |
|search         | LIKE        |Yes |No  |-              |1  |
|between        | BETWEEN     |Yes |Yes |BETWEEN        |2  |
|notBetween     | NOT BETWEEN |Yes |Yes |NOT BETWEEN    |2  |
|null           | IS NULL     |No  |No  |-              |0  |
|notNull        | NULL        |No  |No  |-              |0  |

* `equal`
    It's the **default** filter.

    Compare a field and a value and expected to be equal.

    ```javascript
    const parametres = {
        filters: { 
            some: 123,
            other: { value: 1},
            another: [10,100],
            etc: { value: [100,5000] }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` = 123) and (`t`.`other` = 1) and (`t`.`another` in (10, 100)) and (`t`.`etc` in (100, 5000));
    ```

* `notEqual`

    Compare a field and a value, expects to be different. 

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 1, type: 'notEqual' },
            other: { value: [100,5000], type: 'notEqual' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` != 1) and (`t`.`other` not in (100, 5000));
    ```

* `greater`

    Compare a field and expected to be greater than a value.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 1, type: 'greater' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` > 1);
    ```

* `greaterOrEqual`

    Compare a field and expected to be greater or equal than a value.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 100, type: 'greaterOrEqual' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` >= 100);
    ```

* `lesser`

    Compare a field and expected to be lesser than a value.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 5100, type: 'lesser' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` < 5100);
    ```

* `lesserOrEqual`

    Compare a field and expected to be lesser or equal than a value.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 18, type: 'lesserOrEqual' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` <= 18);
    ```

* `search`

    Compare a field and expected to 'like' a value. Used for Texts values generally. Automatically added `%` at beggining and end to search the string.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 'any', type: 'search' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` LIKE '%any%');
    ```

* `between`

    Compare a field and expected to be between 2 values.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: [1986,2019], type: 'between' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` between 1986 and 2019);
    ```

* `notBetween`
    
    Compare a field and expected not to be between 2 values.

    ```javascript
    const parametres = {
        filters: { 
            some: { value: 1, type: 'notBetween' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` not between 1986 and 2019);
    ```

* `null`
    
    Compare a field and expected to be **null**.

    ```javascript
    const parametres = {
        filters: { 
            some: { type: 'null' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` is null);
    ```

* `notNull`
    
    Compare a field and expected to be **not null**.

    ```javascript
    const parametres = {
        filters: { 
            some: { type: 'notNull' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` is not null);
    ```

### Group by Fields

Use `group` *key* to group by fields. It's SQL equivalent to `GROUP BY`.

* If a value is a *field name*, it's simple

    ```javascript
    const parametres = {
        filters: { 
            group: 'some'
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` group by `t`.`some`;
    ```

* If a value is a `Array` of *field name*, it's multiple

    ```javascript
    const parametres = {
        filters: { 
            group: ['some', 'other']
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` group by `t`.`some`, `t`.`other`;
    ```

## Order

Use `order` *key* to group by fields. It's SQL equivalent to `ORDER BY`.

* The *default* direction is `ASC` Only added field name as *value*.

    ```javascript
    const parametres = {
        filters: { 
            order: 'some'
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` order by `t`.`some` asc;
    ```

* To define a direction, the *value* must be an `object` with key/value `[field_name]:[direction]`.

    ```javascript
    const parametres = {
        filters: { 
            order: { some: 'desc' }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` order by `t`.`some` desc;
    ```

* Multiple order

    ```javascript
    const parametres = {
        filters: { 
            order: {
                some: 'asc',
                other: 'desc'
            }
        }
    }

    const query = new QueryBuilder(knex,someModel,parametres);
    query.build();
    const results = await query.execute();
    ```

    The query is :

    ```sql
    select * from `table` as `t` order by `t`.`some` asc, `t`.`other` desc;
    ```

## Limit

Use *key* `limit` for limit the results, *value* must be an `integer` positive.

```javascript
const parametres = {
    limit: 1000
}

const query = new QueryBuilder(knex,someModel,parametres);
query.build();
const results = await query.execute();
```

The query is :

```sql
select * from `table` as `t` limit 1000;
```

### Offset

Use *key* `page` to pagination like behavior, *value* must be an `integer` positive, and it's the registry number where starts returning the results. [See More](https://dev.mysql.com/doc/refman/5.6/en/select.html)

*Default* value is `1`.

Needs `limit` to work.

```javascript
const parametres = {
    limit: 1000,
    page: 2000
}

const query = new QueryBuilder(knex,someModel,parametres);
query.build();
const results = await query.execute();
```

The query is :

```sql
select * from `table` as `t` limit 1000 offset 2000;
```
- - -

## Errors

The errors are informed with a `QueryBuilderError` with the proper message for each error.

- - -

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
queryBuilder.build(); // select `t`.* from `table_some` as `t;
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
            bar: true,
            other: 'otro'
        }
    }
*/

const params = {
    fields: ['foo','bar','other']
}
const queryBuilder = new QueryBuilder(knex, someModel,params);
// build the query
queryBuilder.build(); // select `t`.`foo`, `t`.`bar`, `t`.`otro` from `table_some` as `t;
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

const params2 = {
    count: 'foo'
}
const queryBuilder2 = new QueryBuilder(knex, someModel,params2);
// build the query
queryBuilder2.build(); // select count(`t.foo`) from `table_some` as `t
// Execute the Query
const results = await queryBuilder2.execute();

```

Using Joins

```javascript
const QueryBuilder = require('@janniscommerce/query-builder');

// knex - an Knex Initialize function with proper database config
/* 
    someModel - Class Model of 'some' microservice
    with
    static get table() {
        return 'table_some'
    };

    static get fields() {
        return {
            foo: true,
            bar: { table: 'tableB'}
        }
    };

    static get joins() {
    return {
        tableB: {
            table: 'tableB',
            alias: 'tb',
            on: ['foo', 'bar']
        }
    };
};
*/

const params = {
    joins: ['tableB']
}
const queryBuilder = new QueryBuilder(knex, someModel,params);
// build the query
queryBuilder.build(); // select * from `table_some` as `t` left join `table_b` as `tb` on `t`.`foo` = `tb`.`bar`;
// Execute the Query
const results = await queryBuilder.execute();

```
