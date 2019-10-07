'use strict';

const QueryBuilderError = require('./query-builder-error');
const QueryBuilderFields = require('./query-builder-fields');

class QueryBuilderOrder {

	/**
	 * Initialize the necesary data to use the Builder
	 * @param {instance} model Model to be used
	 */
	constructor(model) {

		this.modelName = model.constructor.name;

		this.queryBuilderFields = new QueryBuilderFields(model);
	}

	/**
	 * Search in the order parameters and return fields that have to join on a table
	 * @param {object} parameters parameters
	 * @param {object} modelFields Model fields
	 * @returns {array}
	 */
	getJoinsFields({ order }, modelFields) {
		if(!order || (typeof order === 'object' && Array.isArray(order)))
			return [];

		const fields = typeof order === 'object' ? Object.keys(order) : [order];
		return fields.filter(field => (modelFields[field] && modelFields[field].table));
	}

	/**
	 * Build Order By. Call Knex orderBy with order in parameters
     * @param {object} knex must have key 'knexStatement' with knex function
	 * @param {object} parameters
	 */
	buildOrder(knex, model, parameters) {

		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

		// eslint-disable-next-line prefer-destructuring
		let order = parameters.order;
		// If not Order to Build
		if(!order)
			return;

		if(typeof order === 'string')
			order = { [order]: 'asc' };

		if(Array.isArray(order))
			throw new QueryBuilderError('Param order must be an object or string', QueryBuilderError.codes.INVALID_ORDERS);

		for(const [fieldName, direction] of Object.entries(order)) {

			if(!this._validateOrderItem(fieldName, direction))
				throw this.error;

			const formattedField = this.queryBuilderFields._getFormattedField(fieldName);

			if(this.queryBuilderFields._isFlagField(fieldName))
				knex.orderByRaw(`${formattedField} ${direction}`);
			else
				knex.orderBy(formattedField, direction);
		}

	}

	/**
	 * Validates an order item
	 *
	 * @param {string} fieldName The field name
	 * @param {string} direction The order by direction (asc, desc)
	 * @return {boolean} true if valid, false otherwise
	 */
	_validateOrderItem(fieldName, direction) {

		if(!this.queryBuilderFields._validateField(fieldName)) {
			this.error = new QueryBuilderError(`Unknown field '${fieldName}', check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_FIELDS);
			return false;
		}

		if(direction !== 'asc' && direction !== 'desc') {

			this.error = new QueryBuilderError(`Order By direccion must be 'asc' or 'desc', direction received '${direction}'`,
				QueryBuilderError.codes.INVALID_ORDERS);
			return false;
		}

		return true;
	}
}

module.exports = QueryBuilderOrder;
