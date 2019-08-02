# Group by Fields

Use `group` *key* to group by fields. It's SQL equivalent to `GROUP BY`.

* If a value is a *field name*, it's simple

    ```javascript
    const parametres = {
        group: 'some'
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
        group: ['some', 'other']
    }

    const query = new QueryBuilder(knex,someModel);
    const results = await query.get(parametres);
    ```

    The query is :

    ```sql
    select * from `table` as `t` group by `t`.`some`, `t`.`other`;
    ```

- - -

## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Fields](https://github.com/janis-commerce/query-builder/docs/Fields.md)
* [Special Functions](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)
* [Filters](https://github.com/janis-commerce/query-builder/docs/Filters.md)
* [Joins](https://github.com/janis-commerce/query-builder/docs/Joins.md)
* [Orders](https://github.com/janis-commerce/query-builder/docs/Orders.md)
* [Pagintaion](https://github.com/janis-commerce/query-builder/docs/Pagination.md)