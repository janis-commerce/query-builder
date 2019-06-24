'use strict';

const assert = require('assert');
const sinon = require('sinon').createSandbox();

const { QueryBuilderError, QueryBuilderPagination } = require('./../lib');

const makeKnex = () => {
	class FakeKnex {}

	const knexMethods = [
		'limit', 'offset'
	];

	knexMethods.forEach(knexMethod => { FakeKnex[knexMethod] = sinon.stub(); });

	return FakeKnex;
};

describe('Build Pagination', () => {

	let knex;
	let params;

	context('when no Knex function not passed', () => {

		it('should return QueryBuilderError if no params is passed', () => {

			assert.throws(() => QueryBuilderPagination.buildLimit(), { code: QueryBuilderError.codes.INVALID_KNEX });

		});

	});

	context('when params are missing or wrong', () => {

		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Shouldn\'t call knex.limit if \'params.limit\' not passed', () => {
			params = {};

			QueryBuilderPagination.buildLimit(knex, params);

			assert.equal(knex.limit.called, false);
		});

		it('Shouldn\'t call knex.offset if \'params.offset\' not passed', () => {
			params = {};

			QueryBuilderPagination.buildLimit(knex, params);

			assert.equal(knex.offset.called, false);
		});

		it('Should throws Error if invalid \'params.limit\' passed', () => {

			const invalidLimits = [
				'foo',
				['foo', 'bar'],
				{ foo: 'bar' }
			];

			invalidLimits.forEach(invalidLimit => {
				params = { limit: invalidLimit };

				assert.throws(() => QueryBuilderPagination.buildLimit(knex, params), { code: QueryBuilderError.codes.INVALID_LIMITS });
			});

		});

		it('Should throws Error if invalid \'params.offset\' passed', () => {
			const invalidOffsets = [
				'foo',
				['foo', 'bar'],
				{ foo: 'bar' }
			];

			invalidOffsets.forEach(invalidOffset => {
				params = { offset: invalidOffset };

				assert.throws(() => QueryBuilderPagination.buildLimit(knex, params), { code: QueryBuilderError.codes.INVALID_LIMITS });
			});
		});

		it('Should throws Error if invalid \'params.page\' passed ', () => {
			const invalidPages = [
				'foo',
				['foo', 'bar'],
				{ foo: 'bar' }
			];

			invalidPages.forEach(invalidPage => {
				params = { page: invalidPage };

				assert.throws(() => QueryBuilderPagination.buildLimit(knex, params), { code: QueryBuilderError.codes.INVALID_LIMITS });
			});
		});

		it('Should throws Error if valid \'params.page\' but no \'params.limit\' passed ', () => {

			params = { page: 1 };

			assert.throws(() => QueryBuilderPagination.buildLimit(knex, params), { code: QueryBuilderError.codes.INVALID_LIMITS });
		});
	});

	context('when correct params passed', () => {
		beforeEach(() => {
			knex = makeKnex();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('Should call knex.limit if valid \'params.limit\' passed', () => {
			params = { limit: 1 };

			QueryBuilderPagination.buildLimit(knex, params);

			assert(knex.limit.calledOnce);
			assert.deepEqual(knex.limit.args[0], [1]);
		});

		it('Should call knex.limit if valid \'params.limit\' and \'param.page\' passed', () => {
			params = { limit: 5, page: 1 };

			QueryBuilderPagination.buildLimit(knex, params);

			assert(knex.limit.calledOnce);
			assert.deepEqual(knex.limit.args[0], [5]);
		});

		it('Should call knex.offset if \'params.offset\' passed', () => {
			params = { offset: 3 };

			QueryBuilderPagination.buildLimit(knex, params);

			assert(knex.offset.calledOnce);

			assert.deepEqual(knex.offset.args[0], [3]);
		});

		it('Should call knex.offset if \'param.limit\' and \'param.page\' passed', () => {
			params = { limit: 5, page: 3 };

			QueryBuilderPagination.buildLimit(knex, params);

			assert(knex.offset.calledOnce);
			assert(knex.limit.calledOnce);

			assert.deepEqual(knex.offset.args[0], [10]);
			assert.deepEqual(knex.limit.args[0], [5]);
		});

	});

});
