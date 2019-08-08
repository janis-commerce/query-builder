# Fields

## Model

The fields must be define in the model in order to be selected or saved an object.

In the model must be an structured like this:

```javascript
    static get table() {
        return 'table_a';
    };
    
    static get fields() {
        return {
            foo: true,
            bar: { table: 'tableB' },
            other: 'someOtherName'
        };
    };

    static get flags() {
        return {
            foo: { isActive: 1, error: 2 }
        }
    }
```

## Specific Fields

If you want to select a specficic field in the query, you must define `fields` as *key*.

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

## Select All fields

If `fields` wasn't define, it select all fields in the table. By default **Query Builder** adds `t` alias to the table.

```javascript
const query = new QueryBuilder(knex,someModel);
const results = await query.get({});
```

The Query is:

```sql
select `t`.* from `table` as `t`;
```

If you want not use the default alias use a `fields` key in `false` value in `parametres`.

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
- - -

## Wildcard

It's possible select every *field* from the **main table** using a wildcard,and add other fields, filters, etc.

The wildcard is `*`.

In the *model*

```javascript
    static get table() {
        return 'personTable';
    };
    
    static get fields() {
        return {
            id: true,
            name: true,
            lastname: true,
            status: true,
            company: true,
            companyName: { table: 'companyTable' },
            job: true,
            jobName: { table: 'jobTable' }
        };
    };

    static get flags() {
        return {
            status: { isActive: 1 }
        }
    }

    static get joins() {
        return {
            companyTable: {
                table: 'companyTable',
                alias: 'ct',
                on: ['company', 'companyName']
            },
            jobTable: {
                table: 'jobTable',
                alias: 'jt',
                on: ['job', 'jobName']
            }
        }
    }

```

```javascript
const parametres = { 
    fields: ['*','companyName']
};

const query = new QueryBuilder(knex,someModel);
const results = await query.get(parametres);
```

The query is: 

```sql
select `t`.*, `ct`.`company_name` from `table` as `t` left join `company_table` as `ct` on `t`.`company` = `ct`.`company_name`;
```
- - -

## Links to

* [Back to Query Builder](https://github.com/janis-commerce/query-builder/README.md)
* [Special Functions](https://github.com/janis-commerce/query-builder/docs/Special-functions.md)
* [Filters](https://github.com/janis-commerce/query-builder/docs/Filters.md)
* [Joins](https://github.com/janis-commerce/query-builder/docs/Joins.md)
* [Groups](https://github.com/janis-commerce/query-builder/docs/Groups.md)
* [Orders](https://github.com/janis-commerce/query-builder/docs/Orders.md)
* [Pagintaion](https://github.com/janis-commerce/query-builder/docs/Pagination.md)