'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError, QueryBuilderJoins } = require('./../lib');

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'join', 'innerJoin', 'leftJoin', 'leftOuter', 'rightJoin', 'rightOuterJoin', 'fullOuterJoin', 'crossJoin',
		'on', 'orOn'
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

describe('Build Joins', () => {
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

			assert.throws(() => QueryBuilderJoins.buildJoins(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

		it('should return QueryBuilderError if no Model is passed', () => {

			assert.throws(() => QueryBuilderJoins.buildJoins(knex), { code: QueryBuilderError.codes.INVALID_MODEL });

		});

	});

	context('when params are invalid or wrong', () => {

		const joinKnexMethods = ['join', 'innerJoin', 'leftJoin', 'leftOuter', 'rightJoin', 'rightOuterJoin', 'fullOuterJoin', 'crossJoin'];

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Shouldn\'t call knex.join methods if no \'params.joins\' passed or fields and join definition missing', () => {
			model = makeModel({});
			params = {};

			QueryBuilderJoins.buildJoins(knex, model, params);

			joinKnexMethods.forEach(method => {
				assert.equal(knex[method].called, false);
			});
		});
		it('Shouldn\'t call knex.join methods if \'params.joins\' passed but fields definition missing', () => {
			model = makeModel({
				joins: { foo: { alias: 'f', on: ['fieldA', 'fieldB'] } }
			});
			params = {
				joins: ['foo']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_FIELDS });

			joinKnexMethods.forEach(method => {
				assert.equal(knex[method].called, false);
			});
		});
		it('Shouldn\'t call knex.join methods if \'params.joins\' passed but fields and join definition missing', () => {
			model = makeModel({});
			params = {
				joins: ['foo']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });

			joinKnexMethods.forEach(method => {
				assert.equal(knex[method].called, false);
			});
		});

		it('Should throws Error if invalid \'params.joins\' passed', () => {
			model = makeModel({
				foo: true
			});
			params = {
				joins: 'foo'
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'params.joins\' passed but join definition missing', () => {
			model = makeModel({
				fields: { foo: true }
			});
			params = {
				joins: ['foo']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'params.joins\' and join definition join key does not match', () => {
			model = makeModel({
				fields: { foo: true },
				joins: { bar: { alias: 'b', on: ['fieldA', 'fieldB'] } }
			});
			params = {
				joins: ['foo']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if join definition is invalid', () => {
			model = makeModel({
				fields: { foo: true },
				joins: {
					joinA: 'some wrong definition',
					joinB: true,
					joinC: 80,
					joinD: ['foo', 'bar']
				}
			});
			params = {
				joins: ['joinA', 'joinA', 'joinC', 'joinD']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'alias\' is missing in join definition', () => {
			model = makeModel({
				fields: { foo: true },
				joins: { joinA: {} }
			});
			params = {
				joins: ['joinA']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'method\' is missing in join definition', () => {
			model = makeModel({
				fields: { foo: true },
				joins: { joinA: { alias: 'j' } }
			});
			params = {
				joins: ['joinA']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'method\' is invalid in join definition', () => {
			model = makeModel({
				fields: { foo: true },
				joins: { joinA: { alias: 'j', method: 'foo' } }
			});
			params = {
				joins: ['joinA']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'on\' and \'orOn\' is missing in join definition', () => {
			model = makeModel({
				fields: { foo: true },
				joins: { joinA: { alias: 'j', method: 'left' } }
			});
			params = {
				joins: ['joinA']
			};

			assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params), { code: QueryBuilderError.codes.INVALID_JOINS });
		});
		it('Should throws Error if \'on\' and \'orOn\' are invalid in join definition', () => {
			const invalidOns = [
				true,
				123,
				{ foo: 'bar' },
				[],
				[1],
				['foo'],
				['foo', 1],
				['foo', 'bar', 1],
				['foo', 'badOperator', 'bar'],
				[[1], [2]],
				[['foo'], ['bar']],
				[['foo', 'bar'], ['bar']],
				[['foo'], ['foo', 'bar']],
				[['foo', 'bar'], ['foo', 'badOperator', 'bar']],
				[['foo', 'badOperator', 'bar'], ['foo', 'bar']]
			];

			invalidOns.forEach(invalidOn => {
				model = makeModel({
					fields: { foo: true, bar: true },
					joins: { tableA: { alias: 'j', on: invalidOn } }
				});
				params = {
					joins: ['tableA']
				};

				assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params));

				model = makeModel({
					fields: { foo: true, bar: true },
					joins: { tableA: { alias: 'j', orOn: invalidOn } }
				});

				assert.throws(() => QueryBuilderJoins.buildJoins(knex, model, params));
			});
		});
	});

	context('when correct params are passed', () => {

		const assertJoinAndGetFakeKnex = ({ param, joins, flags, fields }, joinTable, joinMethod) => {

			model = makeModel({ joins, flags, fields });

			params = param;

			QueryBuilderJoins.buildJoins(knex, model, params);

			assert(knex[joinMethod].calledOnce);
			assert.equal(knex[joinMethod].args[0][0], joinTable);

			const joinCallback = knex[joinMethod].args[0][1];

			assert.equal(typeof joinCallback, 'function');

			const fakeKnex = makeKnex();

			joinCallback(fakeKnex);

			return fakeKnex;
		};

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should call \'join\' knex method if valid join configuration', () => {

			const queryBuilderParams = {
				param: { joins: ['tableB'] },
				fields: { foo: true, bar: { table: 'tableB' } },
				joins: { tableB: { alias: 'j', on: ['foo', 'bar'] } }
			};

			const fakeKnex = assertJoinAndGetFakeKnex(queryBuilderParams, 'tableB as j', 'leftJoin');

			assert.equal(fakeKnex.on.callCount, 1);

			assert.deepEqual(fakeKnex.on.args[0], ['t.foo', 'j.bar']);

			assert.equal(fakeKnex.orOn.callCount, 0);

		});
		it('Should call \'join\' knex method if valid join with multiple \'on\' configuration', () => {
			const queryBuilderParams = {
				param: { joins: ['tableB'] },
				fields: { foo: true, bar: { table: 'tableB' }, foo2: true, bar2: { table: 'tableB' } },
				joins: {
					tableB: {
						method: 'join',
						alias: 'j',
						on: [['foo', 'bar'], ['foo2', 'bar2']]
					}
				}
			};

			const fakeKnex = assertJoinAndGetFakeKnex(queryBuilderParams, 'tableB as j', 'join');

			assert.equal(fakeKnex.on.callCount, 2);

			assert.deepEqual(fakeKnex.on.args[0], ['t.foo', 'j.bar']);
			assert.deepEqual(fakeKnex.on.args[1], ['t.foo2', 'j.bar2']);

			assert.equal(fakeKnex.orOn.callCount, 0);
		});
		it('Should call \'join\' knex method if valid join with multiple \'orOn\' configuration', () => {
			const queryBuilderParams = {
				param: { joins: ['tableB'] },
				fields: {
					foo: true,
					bar: { table: 'tableB' },
					foo2: true,
					bar2: { table: 'tableB' },
					foo3: true,
					bar3: { table: 'tableB' }
				},
				joins: {
					tableB: {
						alias: 'j',
						method: 'fullOuter',
						orOn: [
							['foo', 'bar'],
							['foo2', '=', 'bar2'],
							['foo3', '!=', 'bar3']
						]
					}
				}
			};

			const fakeKnex = assertJoinAndGetFakeKnex(queryBuilderParams, 'tableB as j', 'fullOuterJoin');

			assert.equal(fakeKnex.on.callCount, 0);
			assert.equal(fakeKnex.orOn.callCount, 3);

			assert.deepEqual(fakeKnex.orOn.args[0], ['t.foo', 'j.bar']);
			assert.deepEqual(fakeKnex.orOn.args[1], ['t.foo2', '=', 'j.bar2']);
			assert.deepEqual(fakeKnex.orOn.args[2], ['t.foo3', '!=', 'j.bar3']);
		});
	});
});
