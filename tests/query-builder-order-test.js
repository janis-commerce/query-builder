'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError, QueryBuilderOrder } = require('./../lib');

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'orderBy', 'orderByRaw'
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


describe('Build Order', () => {
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

			assert.throws(() => QueryBuilderOrder.buildOrder(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

		it('should return QueryBuilderError if no Model is passed', () => {

			assert.throws(() => QueryBuilderOrder.buildOrder(knex), { code: QueryBuilderError.codes.INVALID_MODEL });

		});

	});

	context('when params are missing or wrong', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Shouldn\'t call knex.orderBy if params.order is not passed', () => {

			model = makeModel({});
			params = {};

			QueryBuilderOrder.buildOrder(knex, model, params);

			assert.equal(knex.orderBy.called, false);

		});

		it('Shouldn\'t call knex.orderBy and throw Error if params.fields is not passed', () => {

			model = makeModel({});
			params = {
				order: 'id'
			};

			assert.throws(() => QueryBuilderOrder.buildOrder(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });
			assert.equal(knex.orderBy.called, false);

		});

		it('Should trhows Error if invalid format order is passed', () => {

			model = makeModel({
				fields: { id: true }
			});
			params = {
				order: ['id']
			};

			assert.throws(() => QueryBuilderOrder.buildOrder(knex, model, params), { code: QueryBuilderError.codes.INVALID_ORDERS });
		});

		it('Should trhows Error if invalid direction in order is passed', () => {

			model = makeModel({
				fields: { id: true }
			});
			params = {
				order: { id: 'foo' }
			};

			assert.throws(() => QueryBuilderOrder.buildOrder(knex, model, params), { code: QueryBuilderError.codes.INVALID_ORDERS });
		});

		it('Should trhows Error if field is not present in definition', () => {

			model = makeModel({
				fields: { foo: true }
			});
			params = {
				order: 'bar'
			};

			assert.throws(() => QueryBuilderOrder.buildOrder(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });
		});
	});

	context('when correct params are passed', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should call knex.orderBy if simple \'params.order\' is passed', () => {

			model = makeModel({
				fields: { name: 'name' }
			});
			params = {
				order: 'name'
			};

			QueryBuilderOrder.buildOrder(knex, model, params);

			assert.equal(knex.orderBy.called, true);
			assert.equal(knex.orderBy.calledOnce, true);

			assert.deepEqual(knex.orderBy.args[0], ['t.name', 'asc']);
		});

		it('Should call knex.orderBy if complex \'params.order\' is passed', () => {

			model = makeModel({
				fields: { code: 'code' }
			});
			params = {
				order: { code: 'desc' }
			};

			QueryBuilderOrder.buildOrder(knex, model, params);

			assert.equal(knex.orderBy.called, true);
			assert.equal(knex.orderBy.calledOnce, true);

			assert.deepEqual(knex.orderBy.args[0], ['t.code', 'desc']);
		});

		it('Should call knex.orderBy if multiple \'params.order\' is passed', () => {
			model = makeModel({
				fields: { id: 'id', name: 'name', code: 'code' }
			});
			params = {
				order: { name: 'desc', id: 'asc' }
			};

			QueryBuilderOrder.buildOrder(knex, model, params);

			assert.equal(knex.orderBy.called, true);
			assert.equal(knex.orderBy.calledTwice, true);

			assert.deepEqual(knex.orderBy.args[0], ['t.name', 'desc']);
			assert.deepEqual(knex.orderBy.args[1], ['t.id', 'asc']);
		});

		it('Should call knex.orderByRaw if flag field in \'params.order\' is passed', () => {
			model = makeModel({
				fields: {
					status: true,
					isActive: true
				},
				flags: { status: { isActive: 1 } }
			});
			params = {
				order: 'isActive'
			};

			QueryBuilderOrder.buildOrder(knex, model, params);

			assert.equal(knex.orderByRaw.called, true);
			assert.equal(knex.orderByRaw.calledOnce, true);

			assert.deepEqual(knex.orderByRaw.args[0], ['(t.status & 1) asc']);

		});


	});

});
