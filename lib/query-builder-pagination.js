'use strict';

const QueryBuilderError = require('./query-builder-error');

class QueryBuilderPagination {

	/**
	 * Build Limit and Offset. Call Knex limit and offset methods with parameters
	 * @param {object} knex must have key 'knexStatement' with knex function
	 * @param {object} parameters
	 */
	static buildLimit(knex, parameters) {

		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		// eslint-disable-next-line prefer-destructuring
		let limit = parameters.limit;
		// eslint-disable-next-line prefer-destructuring
		let page = parameters.page;

		if(limit) {

			limit = Number(limit);

			if(!Number.isNaN(limit) || Number.isInteger(limit))
				knex.limit(limit);
			else
				throw new QueryBuilderError('Invalid \'limit\' format, \'limit\' must be an integer', QueryBuilderError.codes.INVALID_LIMITS);
		}

		if(page) {

			page = Number(page);

			if(Number.isNaN(page) || !Number.isInteger(page))
				throw new QueryBuilderError('Invalid \'page\' format, \'page\' must be an integer', QueryBuilderError.codes.INVALID_LIMITS);

			if(!limit)
				throw new QueryBuilderError('Param \'limit\' is required when param page given', QueryBuilderError.codes.INVALID_LIMITS);

			const offset = (page - 1) * limit;

			knex.offset(offset);
		} else {

			// eslint-disable-next-line prefer-destructuring
			let offset = parameters.offset;

			if(!offset)
				return;

			offset = Number(offset);

			if(Number.isNaN(offset) || !Number.isInteger(offset))
				throw new QueryBuilderError('Invalid \'offset\' format, \'offset\' must be an integer', QueryBuilderError.codes.INVALID_LIMITS);

			knex.offset(offset);
		}
	}
}

module.exports = QueryBuilderPagination;
