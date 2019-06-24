# Order

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
- - -

## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Fields](https://github.com/janis-commerce/query-builder/docs/Fields.md)
* [Special Functions](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)
* [Filters](https://github.com/janis-commerce/query-builder/docs/Filters.md)
* [Joins](https://github.com/janis-commerce/query-builder/docs/Joins.md)
* [Groups](https://github.com/janis-commerce/query-builder/docs/Groups.md)
* [Pagintaion](https://github.com/janis-commerce/query-builder/docs/Pagination.md)