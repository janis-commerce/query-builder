'use strict';

const QueryBuilderError = require('./query-builder-error');

class QueryBuilderSelect {

	static get selectFunctions() {
		return {
			count: 'count',
			min: 'min',
			max: 'max',
			sum: 'sum',
			avg: 'avg'
		};
	}

	/**
	 * Initialize the necesary data to use the Builder
	 * @param {instance} model Model to be used
	 */
	static initModel(model) {

		this.modelName = model.constructor.name;
		this.fields = model.constructor.fields;
		this.flags = model.constructor.flags;
		this.joins = model.constructor.joins;
	}

	/**
	 * Build Select. Call Knex Select with fields in params
	 * @param {object} knex must have key 'knexStatement' with knex function
	 * @param {instance} model
	 * @param {object} params
	 */
	static buildSelect(knex, model, params) {

		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);


		this.initModel(model);

		this.params = params;

		// eslint-disable-next-line prefer-destructuring
		const fields = params.fields;

		let fieldsForSelect;
		let flagFieldsForSelect = false;

		if(typeof fields === 'undefined') {
			fieldsForSelect = 't.*';

			if(!this.params.noFlags)
				flagFieldsForSelect = this._getFlagFieldsForSelect(this._getFlagFields());

		} else if(fields === false)
			fieldsForSelect = false;
		else if(Array.isArray(fields)) {

			this._validateFields(fields);

			fieldsForSelect = this._getFieldsForSelect(fields);

			flagFieldsForSelect = this._getFlagFieldsForSelect(fields);

		} else
			throw new QueryBuilderError('Param \'fields\' must be an array', QueryBuilderError.codes.INVALID_FIELDS);

		let nothingToSelect = true;

		if(fieldsForSelect) {
			knex.select(fieldsForSelect);
			nothingToSelect = false;
		}

		if(flagFieldsForSelect) {
			flagFieldsForSelect = Object.values(flagFieldsForSelect).join(', ');
			knex.select(knex.raw(flagFieldsForSelect));
			nothingToSelect = false;
		}

		const selectFunctions = this._getSelectFunctions();

		for(const selectFunction of selectFunctions) {
			knex[selectFunction.method](selectFunction.select);
			nothingToSelect = false;
		}

		if(nothingToSelect)
			throw new QueryBuilderError('Nothing to select', QueryBuilderError.codes.NOTHING_SELECT);
	}

	/**
	 * Validate fields
	 *
	 * @param {array} fields The fields
	 * @return {boolean} true if valid, throw otherwise
	 */
	static _validateFields(fields) {

		fields.forEach(field => {
			if(!this._validateField(field))
				throw this.error;
		});

		return true;
	}

	/**
	 * Validates a field
	 *
	 * @param {string} fieldName The field name
	 * @return {boolean} true if valid, false otherwise
	 */
	static _validateField(fieldName) {

		if(!this._fieldExists(fieldName)) {
			this.error = new QueryBuilderError(`Unknown field '${fieldName}', check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_FIELDS);
			return false; // Order -> error
		}

		return true;
	}

	/**
	 * Check if field exists
	 *
	 * @param {string} fieldName The field name
	 * @return {Boolean} true if exists, false otherwise
	 */
	static _fieldExists(fieldName) {
		return typeof this.fields[fieldName] !== 'undefined';
	}

	/**
	 * Gets the flag fields for the actual model.
	 *
	 * @return {Array} The flag fields.
	 */
	static _getFlagFields() {

		if(typeof this.flags === 'undefined')
			return [];

		let flagFields = [];

		for(const flags of Object.values(this.flags))
			flagFields = [...flagFields, ...Object.keys(flags)];

		return flagFields;
	}

	/**
	 * Filter and format fields for Select purpose
	 *
	 * @param {array} fields The fields
	 * @return {object|false} The fields for select, or false if empty
	 */
	static _getFieldsForSelect(fields) {

		const fieldsForSelect = {};

		fields.forEach(fieldName => {

			if(this._isFlagField(fieldName))
				return;

			fieldsForSelect[this._getAliasForSelect(fieldName)] = this._getFormattedField(fieldName);
		});

		return Object.keys(fieldsForSelect).length ? fieldsForSelect : false;
	}

	/**
	 * Determines if the flag is a 'flag field'.
	 *
	 * @param {string} fieldName The field name
	 * @return {boolean} True if flag field, False otherwise.
	 */
	static _isFlagField(fieldName) {

		const flagData = this._getFlagData(fieldName);

		return flagData !== false;
	}


	/**
	 * Gets the flag data.
	 *
	 * @param {string} fieldName The field name
	 * @return {(Object|false)} The flag data or false if not a flag.
	 */
	static _getFlagData(fieldName) {

		if(typeof this.flags === 'undefined')
			return false;

		for(const [field, flags] of Object.entries(this.flags)) {
			for(const [flag, flagValue] of Object.entries(flags)) {
				if(fieldName !== flag)
					continue;

				if(!this._validateField(field))
					throw new QueryBuilderError(this.error, QueryBuilderError.codes.INVALID_FIELDS);

				return { field, value: flagValue };
			}
		}

		return false;
	}

	/**
	 * Gets the alias for select.
	 *
	 * @param {string} fieldName The field name
	 * @return {string} The alias for select.
	 */
	static _getAliasForSelect(fieldName) {
		return typeof this.fields[fieldName] === 'object' && this.fields[fieldName].alias ? this.fields[fieldName].alias : fieldName;
	}

	/**
	 * Gets the field correct string to select, filter or order
	 *
	 * @param {string} fieldName The field name
	 * @return {string} The formatted field.
	 */
	static _getFormattedField(fieldName) {

		if(this._isFlagField(fieldName))
			return this._getFormattedFlagField(fieldName);

		return `${this._getTableAliasFromField(fieldName)}.${this._getRealFieldName(fieldName)}`;
	}

	/**
	 * Gets the table alias for field.
	 *
	 * @param {string} fieldName The field name
	 * @return {string} The table alias.
	 */
	static _getTableAliasFromField(fieldName) {

		if(typeof this.fields[fieldName] !== 'object')
			return 't';

		const field = this.fields[fieldName];

		if(field.table && this.joins && this.joins[field.table] && this.joins[field.table].alias)
			return this.joins[field.table].alias;

		return 't';
	}

	/**
	 * Gets the real field name.
	 *
	 * @param {string} fieldName The field name
	 * @return {string} The real field name.
	 */
	static _getRealFieldName(fieldName) {

		const field = this.fields[fieldName];

		if(typeof field === 'boolean')
			return fieldName;

		if(typeof field === 'string')
			return field;

		if(typeof field === 'object' && field.field && typeof field.field === 'string')
			return field.field;

		return fieldName;
	}

	static _getFlagFieldsForSelect(fields) {

		const flagFieldsForSelect = {};

		fields.forEach(fieldName => {

			if(!this._isFlagField(fieldName))
				return;

			const { value } = this._getFlagData(fieldName);

			flagFieldsForSelect[fieldName] = `(${this._getFormattedFlagField(fieldName)} = ${value}) as ${fieldName}`;
		});

		return Object.keys(flagFieldsForSelect).length ? flagFieldsForSelect : false;
	}

	static _getFormattedFlagField(fieldName) {

		const { field, value } = this._getFlagData(fieldName);

		return `(${this._getTableAliasFromField(field)}.${this._getRealFieldName(field)} & ${value})`;
	}

	/**
	 * Gets the select functions.
	 *
	 * @return {(Object|boolean)} The select functions.
	 */
	static _getSelectFunctions() {

		const selectFunctions = [];

		for(const [selectFunction, selectMethod] of Object.entries(this.selectFunctions)) {

			if(!this.params[selectFunction])
				continue;

			const data = this.params[selectFunction];

			if(Array.isArray(data))
				throw new QueryBuilderError(`Param '${selectFunction}' can't be an array`, QueryBuilderError.codes.INVALID_SELECT_FUNCTION);

			let field = '*';
			let alias = selectFunction;

			if(data === true)
				field = '*';
			else if(typeof data === 'string')
				field = data;
			else if(typeof data === 'object') {

				if(data.field)
					({ field } = data);

				if(data.alias)
					({ alias } = data);
			} else
				throw new QueryBuilderError(`Param '${selectFunction}' invalid format`, QueryBuilderError.codes.INVALID_SELECT_FUNCTION);

			if(field !== '*') {
				if(!this._validateField(field))
					throw this.error;

				field = this._getFormattedField(field);
			}

			selectFunctions.push({
				method: selectMethod,
				select: `${field} as ${alias}`
			});
		}

		return selectFunctions;
	}
}

module.exports = QueryBuilderSelect;
