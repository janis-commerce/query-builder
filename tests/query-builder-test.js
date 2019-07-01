'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError } = require('./../lib');
const QueryBuilder = require('./../index');

/* eslint-disable prefer-arrow-callback */

const convertKeysToCamelCase = obj => {
	const result = {};

	for(const [key, value] of Object.entries({ ...obj })) {

		const camelCaseKey = key.replace(/_([a-z])/g, letter => letter[1].toUpperCase());

		result[camelCaseKey] = value;
	}

	return result;
};

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'select', 'raw', 'count', 'min', 'max', 'sum', 'avg',
		'where', 'orWhere', 'whereIn', 'whereNotIn', 'whereNot', 'whereNull', 'whereNotNull', 'whereBetween', 'whereNotBetween', 'whereRaw',
		'join', 'innerJoin', 'leftJoin', 'leftOuter', 'rightJoin', 'rightOuterJoin', 'fullOuterJoin', 'crossJoin',
		'on', 'orOn',
		'groupBy', 'groupByRaw',
		'limit', 'offset',
		'orderBy', 'orderByRaw'
	];

	const knexToString = ['insert', 'del', 'update'];

	knexMethods.forEach(knexMethod => { FakeKnex[knexMethod] = sinon.stub(); });
	knexToString.forEach(knexMethod => {
		FakeKnex[knexMethod] = sinon.stub().returns('');
		FakeKnex[knexMethod].toString = sinon.stub().returns('');
	});

	return FakeKnex;
};

const makeKnexFunction = () => makeKnex;

const makeKnexRawShowColumns = (fields, needObject = false) => {
	const rows = [];
	const fieldsKeys = Object.keys(fields);

	if(!fields.date_created)
		fieldsKeys.push('date_created');
	if(!fields.date_modified)
		fieldsKeys.push('date_modified');

	fieldsKeys.forEach(Field => {
		rows.push({
			Field
		});
	});

	if(!needObject)
		return [rows];

	return [convertKeysToCamelCase(rows)];
};

const makeModel = ({
	table = 'table',
	fields = {},
	flags = {},
	joins = {}
}) => {
	class FakeModel {
		static get table() {
			return table;
		}

		get dbTable() {
			return table;
		}

		static get fields() {
			return fields;
		}

		static get flags() {
			// el if es para poder testear los casos en los que los modelos NO tienen flags
			return Object.keys(flags).length > 0 ? flags : undefined;
		}

		static get joins() {
			return joins;
		}

		addDbName(t) {
			return t;
		}
	}

	return new FakeModel();
};

function queryBuilderFactory({
	table = 'table',
	fields = {},
	flags = {},
	joins = {},
	knexSpy,
	knexRaw = 0
} = {}) {

	class Model {
		static get table() {
			return table;
		}

		get dbTable() {
			return table;
		}

		static get fields() {
			return fields;
		}

		static get flags() {
			// el if es para poder testear los casos en los que los modelos NO tienen flags
			return Object.keys(flags).length > 0 ? flags : undefined;
		}

		static get joins() {
			return joins;
		}

		addDbName(t) {
			return t;
		}
	}

	const knex = knexSpy || makeKnexFunction();
	knex.raw = knexRaw ? sinon.stub().returns(makeKnexRawShowColumns(fields, knexRaw === 1)) : sinon.stub();
	const model = new Model();

	return new QueryBuilder(knex, model);
}

describe('QueryBuilder', () => {

	describe('Constructor', () => {

		it('Should construct a QueryBuilder with base params', () => {

			const fakeTable = 'fake_table';
			const fakeFields = {
				dummyField: true,
				fakeField: { table: 'dummyTable' }
			};
			const fakeFlags = {
				dummyField: { isDummy: 1 }
			};
			const fakeJoins = {
				dummyTable: {
					table: 'dummy_table',
					alias: 'dt',
					method: 'left',
					on: ['dummyField', 'fakeField']
				}
			};

			const queryBuilder = queryBuilderFactory({
				table: fakeTable,
				fields: fakeFields,
				flags: fakeFlags,
				joins: fakeJoins
			});

			assert.equal(queryBuilder.table, fakeTable);
			assert.deepEqual(queryBuilder.fields, fakeFields);

		});

		it('Should throw QueryBuilderError when use constructor without Knex and Model', () => {

			assert.throws(() => new QueryBuilder(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

		it('Should throw QueryBuilderError when use constructor without Model', () => {
			const dummyKnex = {
				raw: () => {}
			};

			assert.throws(() => new QueryBuilder(dummyKnex), { code: QueryBuilderError.codes.INVALID_MODEL });

		});
	});

	/* describe('Build', () => {

		it('Should init knex with table \'foo\'', () => {

			const knexSpy = sinon.stub();
			knexSpy.returns({ select() {} });

			const queryBuilder = queryBuilderFactory({ table: 'foo', knexSpy });
			queryBuilder.params = {};
			queryBuilder._build();

			assert(knexSpy.calledOnce);
			assert.deepEqual(knexSpy.args[0][0], { t: 'foo' });
		});

		it('Should build normaly when debug mode on', () => {
			const queryBuilder = queryBuilderFactory();
			queryBuilder.params = { debug: true };
			queryBuilder._build();
		});
	}); */

	describe('Get Fields', () => {

		it('Should return Fields from Database', async () => {

			const queryBuilder = queryBuilderFactory({ fields: { foo: true }, knexRaw: 2 });

			const fakeFields = {
				date_created: {
					Field: 'date_created'
				},
				date_modified: {
					Field: 'date_modified'
				},
				foo: {
					Field: 'foo'
				}
			};

			assert.deepEqual(await queryBuilder._getFields(), fakeFields);
		});

		it('Should return Fields from Database in Object mode', async () => {

			const queryBuilder = queryBuilderFactory({ fields: { foo: true }, knexRaw: 1 });

			const fakeFields = {
				date_created: {
					Field: 'date_created'
				},
				date_modified: {
					Field: 'date_modified'
				},
				foo: {
					Field: 'foo'
				}
			};

			assert.deepEqual(await queryBuilder._getFields(), fakeFields);
		});

		it('Should throw Error', async () => {

			const queryBuilder = queryBuilderFactory({ fields: { foo: true } });

			await assert.rejects(queryBuilder._getFields(), { code: QueryBuilderError.codes.INVALID_TABLE });
		});
	});

	describe('Get', () => {

		it('Should return knexStatement', () => {

			const queryBuilder = queryBuilderFactory();

			const executeSpy = sinon.spy(queryBuilder, 'get');

			queryBuilder.get();

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement if model has structure', () => {

			const queryBuilder = queryBuilderFactory({ fields: { foo: true } });

			const executeSpy = sinon.spy(queryBuilder, 'get');

			queryBuilder.get({ fields: ['foo'] });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should build normaly when debug mode on', () => {

			const queryBuilder = queryBuilderFactory();
			const params = { debug: true };
			queryBuilder.get(params);
		});
	});

	describe('Insert', () => {

		let knex;
		let model;

		beforeEach(() => {
			knex = makeKnexFunction();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should return knexStatement', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'insert');

			await queryBuilder.insert({ foo: 'bar' });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement with Array', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'insert');

			await queryBuilder.insert([{ foo: 'bar' }, { foo: 'bar2' }]);

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement with Array and not Insert some Model Value', async () => {

			const fields = { foo: true, dummy: true, date_modified: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'insert');

			await queryBuilder.insert([{ foo: 'bar', dummy: 'Very' }, { dummy: 'bar2', date_modified: 11111111 }]);

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement with Array and extra fields', async () => {

			const fields = { foo: true, date_modified: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'insert');

			await queryBuilder.insert([{ foo: 'bar', extra: 1 }, { foo: 'bar2', date_modified: 11111111 }]);

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should throw Error if no items to insert', async () => {

			model = makeModel({});
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns({}, true));

			const queryBuilder = new QueryBuilder(knex, model);

			await assert.rejects(queryBuilder.insert(), { code: QueryBuilderError.codes.NO_ITEMS });
		});

		it('Should throw Error if Driver has a problem', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });

			const makeKnexError = () => {
				class KnexError {}

				KnexError.insert = sinon.stub().rejects();

				return KnexError;
			};

			const knexError = () => makeKnexError;
			knexError.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knexError, model);

			const item = {
				foo: 'bar'
			};

			await assert.rejects(queryBuilder.insert(item), { code: QueryBuilderError.codes.DRIVER_ERROR });

		});

	});

	describe('Save', () => {

		let knex;
		let model;

		beforeEach(() => {
			knex = makeKnexFunction();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should return knexStatement', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'save');

			await queryBuilder.save({ foo: 1 });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement with Array', async () => {

			const fields = { id: true, foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'save');

			await queryBuilder.save([{ id: 1, foo: 'bar' }, { id: 100, foo: 'bar2' }]);

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement with Array and extra fields', async () => {

			const fields = { foo: true, date_modified: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'save');

			await queryBuilder.save([{ foo: 'bar', extra: 1 }, { foo: 'bar2' }]);

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement and try to update Date_created', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'save');

			await queryBuilder.save([{ foo: 'bar', date_created: 15101010 }, { foo: 'bar2' }]);

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should throw Error if no item passed', async () => {

			model = makeModel({});
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns({}, true));

			const queryBuilder = new QueryBuilder(knex, model);

			await assert.rejects(queryBuilder.save(), { code: QueryBuilderError.codes.NO_ITEMS });
		});

		it('Should throw Error if Driver has a problem', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });

			const makeKnexError = () => {
				class KnexError {}

				KnexError.insert = sinon.stub().rejects();

				return KnexError;
			};

			const knexError = () => makeKnexError;
			knexError.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knexError, model);

			const item = {
				foo: 'bar'
			};

			await assert.rejects(queryBuilder.save(item), { code: QueryBuilderError.codes.DRIVER_ERROR });

		});

	});

	describe('Update', () => {

		let knex;
		let model;

		beforeEach(() => {
			knex = makeKnexFunction();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should return knexStatement', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'update');

			await queryBuilder.update({ foo: 'bar' }, { dummy: { value: 1, type: 'greater' } });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement with extra fields', async () => {

			const fields = { foo: true, dummy: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'update');

			await queryBuilder.update({ foo: 'bar', extra: 'some extra' }, { dummy: { value: 1, type: 'greater' } });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should return knexStatement and try to update Date_created', async () => {

			const fields = { foo: true, dummy: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'update');

			await queryBuilder.update({ foo: 'bar', date_created: 15101010 }, { dummy: { value: 100, type: 'lesser' } });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should throw Error', async () => {

			model = makeModel({});
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns({}, true));

			const queryBuilder = new QueryBuilder(knex, model);

			await assert.rejects(queryBuilder.update(), { code: QueryBuilderError.codes.NO_VALUES });
		});

		it('Should throw Error if Some Builder has a problem', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });

			const makeKnexError = () => {
				class KnexError {}

				KnexError.where = sinon.stub().callsFake(cb => cb());
				KnexError.update = sinon.stub().returns('');

				return KnexError;
			};

			const knexError = makeKnexError;
			knexError.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knexError, model);

			const values = {
				foo: 'nothing'
			};

			const filters = {
				bar: false
			};

			await assert.rejects(queryBuilder.update(values, filters), { code: QueryBuilderError.codes.INVALID_FIELDS });

		});

		it('Should throw Error if Driver has a problem', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });

			const makeKnexError = () => {
				class KnexError {}

				KnexError.update = sinon.stub().rejects();

				return KnexError;
			};

			const knexError = () => makeKnexError;
			knexError.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knexError, model);

			const values = {
				foo: 'nothing'
			};

			const filters = {
				foo: 'bar'
			};

			await assert.rejects(queryBuilder.update(values, filters), { code: QueryBuilderError.codes.DRIVER_ERROR });

		});

	});

	describe('Remove', () => {

		let knex;
		let model;

		beforeEach(() => {
			knex = makeKnexFunction();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should return knexStatement', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });
			knex.raw = sinon.stub().returns(makeKnexRawShowColumns(fields, true));

			const queryBuilder = new QueryBuilder(knex, model);

			const executeSpy = sinon.spy(queryBuilder, 'remove');

			await queryBuilder.remove({ foo: { value: 10, type: 'lesser' } });

			assert(executeSpy.returnValues[0] instanceof Promise);
		});

		it('Should throw Error if Some Builder has a problem', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });

			const makeKnexError = () => {
				class KnexError {}

				KnexError.where = sinon.stub();
				KnexError.del = sinon.stub().returns('');
				KnexError.del.toString = sinon.stub().returns('');

				return KnexError;
			};

			const knexError = makeKnexError;
			knexError.raw = sinon.stub().callsFake(query => {
				if(!query)
					throw new QueryBuilderError('Some Filter Error', QueryBuilderError.codes.INVALID_FILTERS);
			});

			const queryBuilder = new QueryBuilder(knexError, model);

			const filters = {
				bar: false
			};

			await assert.rejects(queryBuilder.remove(filters), { code: QueryBuilderError.codes.INVALID_FILTERS });

		});

		it('Should throw Error if Driver has a problem', async () => {

			const fields = { foo: true };

			model = makeModel({ fields });

			const makeKnexError = () => {
				class KnexError {}

				KnexError.where = sinon.stub().returns('');
				KnexError.del = sinon.stub().returns('');
				KnexError.del.toString = sinon.stub().returns('');

				return KnexError;
			};

			const knexError = makeKnexError;
			knexError.raw = sinon.stub().callsFake(query => {
				if(!query)
					throw new Error('Fails');
			});

			const queryBuilder = new QueryBuilder(knexError, model);

			const filters = {
				foo: 'bar'
			};

			await assert.rejects(queryBuilder.remove(filters), { code: QueryBuilderError.codes.DRIVER_ERROR });

		});
	});
});
