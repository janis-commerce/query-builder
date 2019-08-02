# Joins

> First, Fields and Join config must be define in **Model** structure.

## Model

In the model must be an structured like this:

```javascript
    static get table() {
        return 'table_a';
    };
    
    static get fields() {
        return {
            foo: true,
            bar: { table: 'tableB' }
        };
    };
    
    static get joins() {
        return {
            tableB: {
                table: 'tableB',
                alias: 'tb',
                on: ['bar', 'foo']
            }
        };
    };
```

## Usage

The Joins are **Automatic**.

```javascript
parametres = {
    fields : ['bar']
}

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
```

The query is :

```sql
select `tb.bar` from `table` as `t` left join `table_b` as `tb` on `t`.`foo` = `tb`.`bar`;
```

- - -


## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Fields](https://github.com/janis-commerce/query-builder/docs/Fields.md)
* [Special Functions](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)
* [Filters](https://github.com/janis-commerce/query-builder/docs/Filters.md)
* [Groups](https://github.com/janis-commerce/query-builder/docs/Groups.md)
* [Orders](https://github.com/janis-commerce/query-builder/docs/Orders.md)
* [Pagintaion](https://github.com/janis-commerce/query-builder/docs/Pagination.md)