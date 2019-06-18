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
    - `model` Model instance. The Model must have table, field, joins, etc. structure define. [See more](https://github.com/janis-commerce/model-controller)

* `insert(items)`
    - `items` - Object to Insert or Array of Objects to Insert.

    Execute `INSERT` Query.

    Returns a `Promise` with `[0]` if everything is OK.

* `save(items)`
    - `items` - Object to Insert or Array of Objects to Insert.

    Execute `INSERT` Query with `Upsert`.

    Returns a `Promise` with `object` if everything is OK.

* `update(values, filters)`
    - `values` will be updated to.
    - `filters` (where clause) conditions to filter rows. See **Filters**.

    Execute `UPDATE` Query.

    Returns a `Promise` with `object` if everything is OK.

* `remove(filters, joins)`
    - `filters` (where clause) conditions to filter rows. See **Filters**.
    - `joins` if you need to joins table. See **Joins**.

    Execute `REMOVE` Query.

    Returns a `Promise` with `object` if everything is OK.

* `get( parametres )`

    - `parametres` , type `object`, Parametres for the query, filters, joins, limits.

    Execute `SELECT` Query.
    
    Returns a `Promise` with the results of execution in the database.

- - -

## Parametres

### Select All fields

If it's empty, it select all fields in the table. By default **Query Builder** adds `t` alias to the table.

```javascript
const query = new QueryBuilder(knex,someModel);
const results = await query.get({});
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

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
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

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
    ```

    The query is :
    
    ```sql
    select max(`t.some`) as `maxSome` from `table` as `t`;
    ```

## Joins

First, Fields and Join config must be define in **Model** structure.

In `parametres` (in *get*) object or `joins` (in *remove*) use a `joins` as *key* and `Array` of `String` with the table names as *value*

```javascript
parametres = {
    joins : ['tableB']
}

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
```

The query is :

```sql
select * from `table` as `t` left join `table_b` as `tb` on `t`.`some` = `tb`.`any`;
```

## Filters / Where

To filter by fields use `filters` as *key* and an `object` or an `Array` of them as *value*.

* These `object` must have key/value : `[field_name]:[expected_result]`.

    ```javascript
    const parametres = {
        filters: {
            some: 5575
        }
    };

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
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

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
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

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
```

The query is :

```sql
select * from `table` as `t` limit 1000 offset 2000;
```
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
const knex = require('Knex');
const const QueryBuilder = require('@janniscommerce/query-builder');

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

const insertItems = await modelQueryBuilder.insert(items);

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




