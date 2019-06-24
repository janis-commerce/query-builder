'use strict';

class QueryBuilderError extends Error {

	static get codes() {

		return {
			INVALID_MODEL: 1,
			INVALID_KNEX: 2,
			INVALID_FIELDS: 3,
			INVALID_SELECT_FUNCTION: 4,
			INVALID_JOINS: 5,
			INVALID_FILTERS: 6,
			INVALID_FLAGS: 7,
			INVALID_ORDERS: 8,
			INVALID_GROUPS: 9,
			INVALID_LIMITS: 10,
			INVALID_TABLE: 11,
			NO_ITEMS: 12,
			NO_VALUES: 13,
			NOTHING_SELECT: 14,
			DUPLICATE_ITEM: 15,
			DRIVER_ERROR: 16

		};

	}

	constructor(err, code) {
		super(err);
		this.message = err.message || err;
		this.code = code;
		this.name = 'QueryBuilderError';
	}
}

module.exports = QueryBuilderError;
