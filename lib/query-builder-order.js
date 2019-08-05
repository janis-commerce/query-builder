'use strict';

const QueryBuilderError = require('./query-builder-error');
const QueryBuilderFields = require('./query-builder-fields');

class QueryBuilderOrder {

	/**
	 * Search in the order parameters and return fields that have to join on a table
	 * @param {object} params Parametres
	 * @param {object} modelFields Model fields
	 * @returns {array}
	 */
	static getJoinsFields({ order }, modelFields) {
		if(!order || (typeof order === 'object' && Array.isArray(order)))
			return [];

		const fields = typeof order === 'object' ? Object.keys(order) : [order];
		return fields.filter(field => (modelFields[field] && modelFields[field].table));
	}

	/**
	 * Build Order By. Call Knex orderBy with order in params
     * @param {object} knex must have key 'knexStatement' with knex function
	 * @param {object} params
	 */
	static buildOrder(knex, model, params) {
		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

		this.modelName = model.constructor.name;

		// To Build the Orders needs to validate Fields
		// Need to Init Builder Fields if it's not
		QueryBuilderFields.initModel(model);

		// eslint-disable-next-line prefer-destructuring
		let order = params.order;
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

			const formattedField = QueryBuilderFields._getFormattedField(fieldName);

			if(QueryBuilderFields._isFlagField(fieldName))
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
	static _validateOrderItem(fieldName, direction) {

		if(!QueryBuilderFields._validateField(fieldName)) {
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
