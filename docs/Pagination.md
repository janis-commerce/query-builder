# Pagination

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

## Offset

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

## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Fields](https://github.com/janis-commerce/query-builder/docs/Fields.md)
* [Special Functions](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)
* [Filters](https://github.com/janis-commerce/query-builder/docs/Filters.md)
* [Joins](https://github.com/janis-commerce/query-builder/docs/Joins.md)
* [Groups](https://github.com/janis-commerce/query-builder/docs/Groups.md)
* [Orders](https://github.com/janis-commerce/query-builder/docs/Orders.md)