'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError, QueryBuilderFilters } = require('./../lib');

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'where', 'orWhere', 'whereIn', 'whereNotIn', 'whereNot', 'whereNull', 'whereNotNull', 'whereBetween', 'whereNotBetween', 'whereRaw'
	];

	knexMethods.forEach(knexMethod => { FakeKnex[knexMethod] = sinon.stub(); });

	return FakeKnex;
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

	}

	return new FakeModel();
};

describe('Build Filters', () => {
	let knex;
	let model;
	let params;

	const callWhereCallback = (knexStatement, whereMethod = 'where', callIndex = 0) => {

		const whereCallback = knexStatement[whereMethod].args[callIndex][0];

		assert.equal(typeof whereCallback, 'function');

		const fakeKnex = makeKnex();

		whereCallback(fakeKnex);

		return fakeKnex;
	};

	context('when no Knex function or Model is passed', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should return QueryBuilderError if no params is passed', () => {

			assert.throws(() => QueryBuilderFilters.buildFilters(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

		it('should return QueryBuilderError if no Model is passed', () => {

			assert.throws(() => QueryBuilderFilters.buildFilters(knex), { code: QueryBuilderError.codes.INVALID_MODEL });

		});

	});

	context('when params are missing or wrong', () => {

		const assertThrowsWhenBuildAndWhereCallback = ({ param, joins, fields, flags }) => {

			model = makeModel({ joins, fields, flags });

			params = param;

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);
			assert.throws(() => { callWhereCallback(knex); }, QueryBuilderError);
		};

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Shouldn\t call knex.where methods if no filters passed', () => {
			model = makeModel({});

			params = {};

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.notCalled);
		});
		it('Shouldn\t call knex.where methods if filters passed but missed definition', () => {
			model = makeModel({});

			params = {};

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.notCalled);
		});

		it('Should throws Error if non-existent filters passed', () => {
			assertThrowsWhenBuildAndWhereCallback({
				param: { filters: { id: 1 } },
				fields: { foo: 'foo' }
			});
		});
		it('Should throws Error if invalid filter type passed', () => {
			assertThrowsWhenBuildAndWhereCallback({
				param: { filters: { id: { field: 'id', type: 'foo', value: 1 } } },
				fields: { id: 'id' }
			});
		});
		it('Should throws Error if passed a filter that denies multiple values', () => {
			assertThrowsWhenBuildAndWhereCallback({
				param: { filters: { id: { field: 'id', type: 'greater', value: [1, 2, 3] } } },
				fields: { id: 'id' }
			});
		});
		it('Should throws Error if passed a filter that needs multiple values', () => {
			assertThrowsWhenBuildAndWhereCallback({
				param: { filters: { id: { field: 'id', type: 'between', value: 1 } } },
				fields: { id: 'id' }
			});
		});
		it('Should throws Error if passed a filter that needs specific quantity of multiple values', () => {
			assertThrowsWhenBuildAndWhereCallback({
				param: { filters: { id: { field: 'id', type: 'between', value: [1, 2, 3] } } },
				fields: { id: 'id' }
			});
		});
		it('Should call \'whereRaw\' knex method for flags filters and setted default value in flags if are incorrect type', () => {

			model = makeModel({
				fields: {
					status: true,
					isActive: true,
					error: true
				},
				flags: {
					status: { isActive: 1, error: 2 }
				}
			});

			params = {
				filters: { isActive: {}, error: { value: [] } }
			};

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereRaw.callCount, 2);
			assert.deepEqual(fakeKnex.whereRaw.args[0], ['(t.status & 1) = ?', '1']);
			assert.deepEqual(fakeKnex.whereRaw.args[1], ['(t.status & 2) = ?', '2']);

		});

	});

	context('when correct params are passed', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should call \'where\' knex method if filter passed', () => {

			params = { filters: { id: 1 } };

			model = makeModel({
				fields: { id: 'id' }
			});

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', 1]);
		});

		it('Should call \'whereIn\' knex method if filter with multiple values passed', () => {

			params = { filters: { id: { value: [1, 2] } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereIn.callCount, 1);
			assert.deepEqual(fakeKnex.whereIn.args[0], ['t.id', [1, 2]]);
		});

		it('Should call \'orWhere\' knex method once if filter as array are passed', () => {

			params = { filters: [{ id: 1 }] };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.orWhere.calledOnce);

			const fakeKnex = callWhereCallback(knex, 'orWhere');

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', 1]);
		});

		it('Should call \'orWhere\' knex method twice if 2 filter in an array are passed', () => {

			params = {
				filters: [{ id: 1 }, { id: 3 }]
			};
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.orWhere.calledTwice);

			const fakeKnex = callWhereCallback(knex, 'orWhere');

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', 1]);

			const fakeKnex2 = callWhereCallback(knex, 'orWhere', 1);

			assert.equal(fakeKnex2.where.callCount, 1);
			assert.deepEqual(fakeKnex2.where.args[0], ['t.id', 3]);
		});

		it('Should call \'whereNot\' knex method if \'notEqual\' filter passed', () => {

			params = { filters: { id: { value: 98, type: 'notEqual' } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereNot.callCount, 1);
			assert.deepEqual(fakeKnex.whereNot.args[0], ['t.id', 98]);
		});

		it('Should call \'whereNotIn\' knex method if \'notEqual\' filter with multiple values passed', () => {

			params = { filters: { id: { value: [1, 2], type: 'notEqual' } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereNotIn.callCount, 1);
			assert.deepEqual(fakeKnex.whereNotIn.args[0], ['t.id', [1, 2]]);
		});

		it('Should call \'where\' knex method with \'>\' if \'greater\' filter passed', () => {

			params = { filters: { id: { value: 1, type: 'greater' } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', '>', 1]);
		});

		it('Should call \'where\' knex method with \'>=\' if \'greaterOrEqual\' filter passed', () => {

			params = { filters: { id: { value: 1, type: 'greaterOrEqual' } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', '>=', 1]);
		});

		it('Should call \'where\' knex method with \'<\' if \'lesser\' filter passed', () => {

			params = { filters: { id: { value: 1, type: 'lesser' } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', '<', 1]);
		});

		it('Should call \'where\' knex method with \'<=\' if \'lesserOrEqual\' filter passed', () => {

			params = { filters: { id: { value: 1, type: 'lesserOrEqual' } } };
			const fields = { id: 'id' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.id', '<=', 1]);
		});

		it('Should call \'where\' knex method with \'LIKE\' if \'search\' filter passed', () => {

			params = { filters: { foo: { value: 'foo', type: 'search' } } };
			const fields = { foo: 'foo' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.foo', 'LIKE', '%foo%']);
		});

		it('Should call \'whereBetween\' knex method if \'between\' filter passed', () => {

			params = { filters: { foo: { value: ['hey', 'there'], type: 'between' } } };
			const fields = { foo: 'foo' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereBetween.callCount, 1);
			assert.deepEqual(fakeKnex.whereBetween.args[0], ['t.foo', ['hey', 'there']]);
		});

		it('Should call \'whereNotBetween\' knex method if \'notBetween\' filter passed', () => {

			params = { filters: { foo: { value: ['hey', 'there'], type: 'notBetween' } } };
			const fields = { foo: 'foo' };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereNotBetween.callCount, 1);
			assert.deepEqual(fakeKnex.whereNotBetween.args[0], ['t.foo', ['hey', 'there']]);
		});

		it('Should call \'whereNull\' knex method with \'t.foo\' if null type filter passed', () => {

			params = { filters: { foo: { type: 'null' } } };
			const fields = { foo: true };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereNull.callCount, 1);
			assert.deepEqual(fakeKnex.whereNull.args[0], ['t.foo']);
		});

		it('Should call \'whereNotNull\' knex method with \'t.foo\' if notNull type filter passed', () => {

			params = { filters: { foo: { type: 'notNull' } } };
			const fields = { foo: true };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereNotNull.callCount, 1);
			assert.deepEqual(fakeKnex.whereNotNull.args[0], ['t.foo']);
		});

		it('Should call \'where\' knex method with \'LIKE\'ifn \'search\' in fields definition', () => {

			params = { filters: { foo: { value: 'foo' } } };
			const fields = { foo: { type: 'search' } };

			model = makeModel({ fields });

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.where.callCount, 1);
			assert.deepEqual(fakeKnex.where.args[0], ['t.foo', 'LIKE', '%foo%']);
		});

		it('Should call \'whereRaw\' knex method for flags filters', () => {

			model = makeModel({
				fields: {
					status: true,
					isActive: true,
					error: true
				},
				flags: {
					status: { isActive: 1, error: 2 }
				}
			});

			params = {
				filters: { isActive: 0, error: 0 }
			};

			QueryBuilderFilters.buildFilters(knex, model, params);

			assert(knex.where.calledOnce);

			const fakeKnex = callWhereCallback(knex);

			assert.equal(fakeKnex.whereRaw.callCount, 2);
			assert.deepEqual(fakeKnex.whereRaw.args[0], ['(t.status & 1) = ?', '0']);
			assert.deepEqual(fakeKnex.whereRaw.args[1], ['(t.status & 2) = ?', '0']);

		});
	});

});
