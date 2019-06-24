'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError, QueryBuilderGroup } = require('./../lib');

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'groupBy', 'groupByRaw'
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

		addDbName(t) {
			return t;
		}
	}

	return new FakeModel();
};

describe('Build Group', () => {
	let knex;
	let model;
	let params;

	context('when no Knex function or Model is passed', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should return QueryBuilderError if no params is passed', () => {

			assert.throws(() => QueryBuilderGroup.buildGroup(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

		it('should return QueryBuilderError if no Model is passed', () => {

			assert.throws(() => QueryBuilderGroup.buildGroup(knex), { code: QueryBuilderError.codes.INVALID_MODEL });

		});

	});

	context('when params are missing or wrong', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Shouldn\'t call knex.groupBy if \'params.group\' not passed', () => {
			params = {};
			model = makeModel({});

			QueryBuilderGroup.buildGroup(knex, model, params);

			assert.equal(knex.groupBy.called, false);
		});

		it('Shouldn\'t call knex.groupBy if \'params.group\' passed but missed fields definition', () => {
			params = { group: { foo: 'bar' } };
			model = makeModel({});

			assert.throws(() => QueryBuilderGroup.buildGroup(knex, model, params), { code: QueryBuilderError.codes.INVALID_GROUPS });
			assert.equal(knex.groupBy.called, false);
		});

		it('Shouldn\'t call knex.groupBy if \'params.group\' as false passed', () => {
			params = {
				group: false
			};
			model = makeModel({
				fields: { foo: true }
			});

			QueryBuilderGroup.buildGroup(knex, model, params);

			assert.equal(knex.groupBy.called, false);
		});

		it('Should throws Error if invalid \'params.group\' passed', () => {
			params = {
				group: { foo: 'bar' }
			};
			model = makeModel({
				fields: { foo: true }
			});

			assert.throws(() => QueryBuilderGroup.buildGroup(knex, model, params), { code: QueryBuilderError.codes.INVALID_GROUPS });

		});

		it('Should throws Error if valid \'params.group\' passed but unknown field', () => {
			params = {
				group: 'bar'
			};
			model = makeModel({
				fields: { foo: true }
			});

			assert.throws(() => QueryBuilderGroup.buildGroup(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });
		});

		it('Should throws Error if valid \'params.group\' passed but unknown field in an array', () => {
			params = {
				group: ['bar']
			};
			model = makeModel({
				fields: { foo: true }
			});

			assert.throws(() => QueryBuilderGroup.buildGroup(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });
		});

		it('Should throws Error if \'params.group\' as an empty array', () => {
			params = {
				group: []
			};
			model = makeModel({
				fields: { foo: true }
			});

			assert.throws(() => QueryBuilderGroup.buildGroup(knex, model, params), { code: QueryBuilderError.codes.INVALID_GROUPS });
		});

	});

	context('when correct params are passed', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should call knex.groupBy if valid \'params.group\' field passed', () => {
			model = makeModel({
				fields: { foo: true }
			});
			params = {
				group: 'foo'
			};

			QueryBuilderGroup.buildGroup(knex, model, params);

			assert(knex.groupBy.calledOnce);
			assert.deepEqual(knex.groupBy.args[0], ['t.foo']);
		});

		it('Should call knex.groupBy if valid \'params.group\' array of fields passed', () => {
			model = makeModel({
				fields: { foo: true, bar: true }
			});
			params = {
				group: ['foo', 'foo', 'bar'] // arrayUnique for avoid repetition
			};

			QueryBuilderGroup.buildGroup(knex, model, params);

			assert(knex.groupBy.calledTwice);
			assert.deepEqual(knex.groupBy.args[0], ['t.foo']);
			assert.deepEqual(knex.groupBy.args[1], ['t.bar']);
		});

		it('Should call knex.groupByRaw if \'params.group\' with a flag field passed', () => {
			model = makeModel({
				fields: {
					status: true,
					isActive: { field: 'status', flag: 1 }
				},
				flags: { status: { isActive: 1 } }
			});
			params = {
				group: 'isActive'
			};

			QueryBuilderGroup.buildGroup(knex, model, params);

			assert(knex.groupByRaw.calledOnce);
			assert.deepEqual(knex.groupByRaw.args[0], ['(t.status & 1)']);
		});
	});

});
