'use strict';

const QueryBuilderError = require('./query-builder-error');
const QueryBuilderFields = require('./query-builder-fields');
const Utils = require('./utils');

class QueryBuilderGroup {

	/**
	 * Initialize the necesary data to use the Builder
	 * @param {instance} model Model to be used
	 */
	static initModel(model) {
		// If the Builder was init before and with the same model, don't init again.
		if(this.modelName && this.modelName === model.constructor.name)
			return;

		this.modelName = model.constructor.name;
	}

	/**
	 * Search in the group parameters and return fields that have to join on a table
	 * @param {object} parameters parameters
	 * @param {object} modelFields Model fields
	 * @returns {array}
	 */
	static getJoinsFields({ group }, modelFields) {
		if(!group || (typeof group === 'object' && !Array.isArray(group)))
			return [];

		const fields = Array.isArray(group) ? [...group] : [group];
		return fields.filter(field => (modelFields[field] && modelFields[field].table));
	}

	/**
	 * Builds group by function.
	 * @param {object} knex must have key 'knexStatement' with knex function
	 * @param {instance} model
	 * @param {object} parameters
	 */
	static buildGroup(knex, model, parameters) {

		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

		this.initModel(model);

		// To Build the Orders needs to validate Fields
		// Need to Init Builder Fields if it's not
		QueryBuilderFields.initModel(model);

		// eslint-disable-next-line prefer-destructuring
		let group = parameters.group;

		if(typeof group === 'undefined' || group === false)
			return;

		if(typeof group === 'string')
			group = [group];
		else if(!Array.isArray(group))
			throw new QueryBuilderError('Param \'group\' must be string or an array', QueryBuilderError.codes.INVALID_GROUPS);

		if(!group.length)
			throw new QueryBuilderError(`Param 'group' must have some fields, check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_GROUPS);

		group = Utils.arrayUnique(group);

		group.forEach(fieldName => {

			if(!this._validateGroupItem(fieldName))
				throw this.error;

			const formattedField = QueryBuilderFields._getFormattedField(fieldName);

			if(QueryBuilderFields._isFlagField(fieldName))
				knex.groupByRaw(formattedField);
			else
				knex.groupBy(formattedField);
		});
	}

	/**
	 * Validates a group item
	 *
	 * @param {string} fieldName The field name
	 * @return {boolean} true if valid, false otherwise
	 */
	static _validateGroupItem(fieldName) {

		if(!QueryBuilderFields._validateField(fieldName)) {
			this.error = new QueryBuilderError(`Unknown field '${fieldName}', check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_FIELDS);
			return false;
		}
		return true;
	}
}

module.exports = QueryBuilderGroup;
