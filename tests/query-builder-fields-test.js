'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError, QueryBuilderFields } = require('./../lib');

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'select', 'raw', 'count', 'min', 'max', 'sum', 'avg'
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

	return new FakeModel({
		id: true
	});
};

let queryBuilderFields;

const makeQueryBuilder = model => {
	if(!model)
		queryBuilderFields = new QueryBuilderFields(makeModel({}));
	else
		queryBuilderFields = new QueryBuilderFields(model);
};

describe('Build Group', () => {
	let knex;
	let model;
	let params;

	context('when no Knex function or Model is passed', () => {

		beforeEach(() => {
			knex = makeKnex();
			makeQueryBuilder();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should return QueryBuilderError if no params is passed', () => {

			assert.throws(() => queryBuilderFields.buildSelect(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

		it('should return QueryBuilderError if no Model is passed', () => {

			assert.throws(() => queryBuilderFields.buildSelect(knex), { code: QueryBuilderError.codes.INVALID_MODEL });

		});

	});

	context('when params are missing or wrong', () => {

		beforeEach(() => {
			knex = makeKnex();
			makeQueryBuilder();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('shouldn\'t call knex.select() if params.fields passed as false and has select functions', () => {

			model = makeModel({
				fields: { id: true }
			});

			params = { fields: false, count: true };

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.notCalled);
		});

		it('shouldn\'t call knex.count() if no params.count passed', () => {

			model = makeModel({});

			params = {};

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.count.notCalled);
		});

		it('should throws Error if invalid params.fields passed and fields definition missed', () => {

			model = makeModel({
				fields: { id: true }
			});

			params = { fields: 'id' };

			makeQueryBuilder(model);

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });

			assert(knex.select.notCalled);
		});

		it('should throws Error if \'params.fields\' not present in fields definition missed', () => {

			model = makeModel({
				fields: { foo: true }
			});

			params = { fields: ['bar'] };

			makeQueryBuilder(model);

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });

			assert(knex.select.notCalled);
		});

		it('should throws Error if params.fields passed and fields definition missed', () => {

			model = makeModel({});

			params = { fields: ['id'] };

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });

			assert(!knex.select.called);
		});

		it('should throws Error if params.fields as an empty array', () => {

			model = makeModel({});

			params = { fields: [] };

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.NOTHING_SELECT });

			assert(!knex.select.called);
		});

		it('should throws Error if params.fields passed as false and no select functions', () => {

			model = makeModel({});

			params = { fields: false };

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.NOTHING_SELECT });

			assert(!knex.select.called);
		});

		it('should throws Error if params.count passed with unknown field', () => {

			model = makeModel({});

			params = { count: 'unknown' };

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });

			assert(knex.count.notCalled);
		});

		it('should throws Error if invalid formatted params.count passed', () => {

			const invalidCounts = [
				10,
				[],
				[1],
				['foo'],
				['foo', 'bar'],
				['foo', 'bar', 10]
			];

			invalidCounts.forEach(invalidCount => {

				model = makeModel({});

				params = { count: invalidCount };

				assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.INVALID_SELECT_FUNCTION });

				assert(knex.count.notCalled);
			});
		});

		it('should throws Error if wrong flag reference field', () => {

			model = makeModel({
				fields: {
					isActive: true
					// status missing
				},
				flags: {
					status: { isActive: 1 }
				}
			});

			params = {
				fields: ['isActive']
			};

			makeQueryBuilder(model);

			assert.throws(() => queryBuilderFields.buildSelect(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });

			assert(!knex.select.called);
		});

	});

	context('when correct params are passed', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should call knex.select() if params.fields passed and definition exists', () => {

			model = makeModel({
				fields: { id: true }
			});

			params = { fields: ['id'] };

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.called);
			assert.deepEqual(knex.select.args[0][0], { id: 't.id' });
		});

		it('should call knex.select() if params.fields passed and complex with \'field\' definition exists', () => {

			model = makeModel({
				fields: { foo: { field: 'bar' } }
			});

			params = { fields: ['foo'] };

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.called);
			assert.deepEqual(knex.select.args[0][0], { foo: 't.bar' });
		});

		it('should call knex.select() if params.fields passed and complex with \'field\' and \'alias\' definition exists', () => {

			model = makeModel({
				fields: { foo: { field: 'bar', alias: 'greatAlias' } }
			});

			params = { fields: ['foo'] };

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.called);
			assert.deepEqual(knex.select.args[0][0], { greatAlias: 't.bar' });
		});

		it('should call knex.select() if no params.fields passed and fields definition missed', () => {

			model = makeModel({});

			params = {};

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.calledOnce);
			assert.deepEqual(knex.select.args[0][0], 't.*');
		});

		it('should call knex.select() if fields definition exists but no params.fields passed', () => {

			model = makeModel({
				fields: { id: true }
			});

			params = {};

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.calledOnce);
			assert.deepEqual(knex.select.args[0][0], 't.*');
		});

		it('should call knex.select() if t.* and model flags when no params.fields given', () => {

			model = makeModel({
				fields: { id: true, status: true, isActive: true, error: true },
				flags: { status: { isActive: 1, error: 2 } }
			});

			params = {};

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.calledTwice);

			assert.deepEqual(knex.select.args[0][0], 't.*');

			assert(knex.raw.calledOnce);

			assert.deepEqual(knex.raw.args[0][0], '((t.status & 1) = 1) as isActive, ((t.status & 2) = 2) as error');
		});

		it('should call knex.select() if t.* and no flags when no fields given and noFlags param as true', () => {

			model = makeModel({
				fields: { id: true, status: true, isActive: true, error: true },
				flags: { status: { isActive: 1, error: 2 } }
			});

			params = { noFlags: true };

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.calledOnce);

			assert.deepEqual(knex.select.args[0][0], 't.*');

			assert(knex.raw.notCalled);
		});


		it('should call knex.select() and knex.raw() if params.fields with a flag passed', () => {

			model = makeModel({
				fields: {
					status: true,
					isActive: true
				},
				flags: { status: { isActive: 1 } }
			});

			params = { fields: ['isActive'] };

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.called);
			assert(knex.raw.called);

			assert.deepEqual(knex.raw.args[0][0], '((t.status & 1) = 1) as isActive');
		});

		it('should\'t use flag', () => {

			model = makeModel({
				fields: {
					status: true,
					isActive: true
				},
				flags: {
					status: { isActive: 1 }
				}
			});

			params = {
				fields: ['status']
			};

			makeQueryBuilder(model);

			queryBuilderFields.buildSelect(knex, model, params);

			assert(knex.select.calledOnce);
		});

		describe('select Functions', () => {

			beforeEach(() => {
				makeQueryBuilder();
			});

			const selectFunctions = ['count', 'min', 'max', 'sum', 'avg'];

			selectFunctions.forEach(selectFunction => {

				it(`should call knex.${selectFunction} method if ${selectFunction} as 'true' passed`, () => {

					model = makeModel({});

					params = { [selectFunction]: true };

					queryBuilderFields.buildSelect(knex, model, params);

					assert(knex[selectFunction].calledOnce);
					assert.deepEqual(knex[selectFunction].args[0], [`* as ${selectFunction}`]);

				});

				it(`should call knex.${selectFunction} method if ${selectFunction} as valid field passed`, () => {

					model = makeModel({
						fields: { id: true }
					});

					params = { [selectFunction]: 'id' };

					makeQueryBuilder(model);

					queryBuilderFields.buildSelect(knex, model, params);

					assert(knex[selectFunction].calledOnce);
					assert.deepEqual(knex[selectFunction].args[0], [`t.id as ${selectFunction}`]);

				});

				it(`should call knex.${selectFunction} method if ${selectFunction} as object with valid field passed`, () => {

					model = makeModel({
						fields: { id: true }
					});

					params = { [selectFunction]: { field: 'id' } };

					makeQueryBuilder(model);

					queryBuilderFields.buildSelect(knex, model, params);

					assert(knex[selectFunction].calledOnce);
					assert.deepEqual(knex[selectFunction].args[0], [`t.id as ${selectFunction}`]);

				});

				it(`should call knex.${selectFunction} method if ${selectFunction} as object with alias passed`, () => {

					model = makeModel({});

					params = { [selectFunction]: { alias: `${selectFunction}Alias` } };

					queryBuilderFields.buildSelect(knex, model, params);

					assert(knex[selectFunction].calledOnce);
					assert.deepEqual(knex[selectFunction].args[0], [`* as ${selectFunction}Alias`]);

				});

				it(`should call knex.${selectFunction} method if ${selectFunction} as object with valid field and alias passed`, () => {

					model = makeModel({
						fields: { id: true }
					});

					params = { [selectFunction]: { field: 'id', alias: `${selectFunction}Alias` } };

					makeQueryBuilder(model);

					queryBuilderFields.buildSelect(knex, model, params);

					assert(knex[selectFunction].calledOnce);
					assert.deepEqual(knex[selectFunction].args[0], [`t.id as ${selectFunction}Alias`]);

				});

			});
		});

	});

});
