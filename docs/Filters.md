# Filters / Where

Use `filters` as *key*, could have an `object` or an `Array` or combination of them as *value*.

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

|Type           |SQL Operator	    | Require a value | Multiple values | SQL Multiple Operator | Fixed amount of Values |
|---------------|-------------------|-----------------|-----------------|-----------------------|------------------------|
|equal          | =                 |Yes              |Yes              |IN()                   |No                      |
|notEqual       | !=                |Yes              |Yes              |NOT IN()               |No                      |
|greater        | >                 |Yes              |No               |-                      |1                       |
|greaterOrEqual | >=                |Yes              |No               |-                      |1                       |
|lesser         | <                 |Yes              |No               |-                      |1                       |
|lesserOrEqual  | <=                |Yes              |No               |-                      |1                       |
|search         | LIKE              |Yes              |No               |-                      |1                       |
|between        | BETWEEN           |Yes              |Yes              |BETWEEN                |2                       |
|notBetween     | NOT BETWEEN       |Yes              |Yes              |NOT BETWEEN            |2                       |
|null           | IS NULL           |No               |No               |-                      |0                       |
|notNull        | NULL              |No               |No               |-                      |0                       |

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

    const query = new QueryBuilder(knex, someModel);
    const results = await query.get(parametres);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
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

    const query = new QueryBuilder(knex, someModel);
    const results = await query.get(parametres);
    ```

    The query is :

    ```sql
    select * from `table` as `t` where (`t`.`some` is not null);
    ```

## Flags

To filter by Flags, first it must be define on the *model*.

In the model: 

```javascript
    
    static get fields() {
        return {
            foo: true
        };
    };

    static get flags() {
        return {
            foo: { isActive: 1, error: 2 }
        }
    }
```

Usage: 

* For **false** match

    ```javascript
        const parametres = {
            filters: { 
                filters: {
                    isActive: false // could be 0, '0' or 'false'
                }
            }
        }

        const query = new QueryBuilder(knex, someModel);
        const results = await query.get(parametres);
    ```

    The query is :

    ```sql
        select * from `table` as `t` where  ((`t`.`foo` & 1) = 0);
    ```

* For **true** match

    ```javascript
        const parametres = {
            filters: { 
                filters: {
                    error: true // could be anything except 0, '0', false or 'false'
                }
            }
        }

        const query = new QueryBuilder(knex, someModel);
        const results = await query.get(parametres);
    ```

    The query is :

    ```sql
        select * from `table` as `t` where  ((`t`.`foo` & 2) = 2);
    ```
- - -

## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Fields](https://github.com/janis-commerce/query-builder/docs/Fields.md)
* [Special Functions](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)
* [Joins](https://github.com/janis-commerce/query-builder/docs/Joins.md)
* [Groups](https://github.com/janis-commerce/query-builder/docs/Groups.md)
* [Orders](https://github.com/janis-commerce/query-builder/docs/Orders.md)
* [Pagintaion](https://github.com/janis-commerce/query-builder/docs/Pagination.md)