# Special Functions

It's posible add special functions in the queries, as a *key* with the following name :

|Function	|SQL Operator	| Description                               |
|-----------|---------------|-----------------------------------------  |
|count		|COUNT()        |Counts the registries                      |
|min		|MIN() 			|Get the minimum registry                   |
|max		|MAX() 		    |Get the maximum registry                   |
|sum		|SUM() 			|Calculate the sum of the registries        |
|avg		|AVG 	        |Calculate the average of the registries    |

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


- - -

## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Fields](https://github.com/janis-commerce/query-builder/docs/Fields.md)
* [Filters](https://github.com/janis-commerce/query-builder/docs/Filters.md)
* [Joins](https://github.com/janis-commerce/query-builder/docs/Joins.md)
* [Groups](https://github.com/janis-commerce/query-builder/docs/Groups.md)
* [Orders](https://github.com/janis-commerce/query-builder/docs/Orders.md)
* [Pagintaion](https://github.com/janis-commerce/query-builder/docs/Pagination.md)