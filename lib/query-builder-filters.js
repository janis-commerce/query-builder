'use strict';

const QueryBuilderError = require('./query-builder-error');
const QueryBuilderFields = require('./query-builder-fields');

class QueryBuilderFilters {

	static get filterTypes() {
		return {
			equal: { multipleValues: true, multipleMethod: 'whereIn' }, // default
			notEqual: { multipleValues: true, method: 'whereNot', multipleMethod: 'whereNotIn' },
			flagEqual: { method: 'whereRaw' },
			greater: { operator: '>' },
			greaterOrEqual: { operator: '>=' },
			lesser: { operator: '<' },
			lesserOrEqual: { operator: '<=' },
			search: { operator: 'LIKE', valuePrefix: '%', valueSuffix: '%' },
			between: { multipleValues: true, multipleMethod: 'whereBetween', needMultipleValues: 2 },
			notBetween: { multipleValues: true, multipleMethod: 'whereNotBetween', needMultipleValues: 2 },
			null: { method: 'whereNull', noValueNeeded: true },
			notNull: { method: 'whereNotNull', noValueNeeded: true }
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
	}

	/**
	 * Search in the filters parameters and return fields that have to join on a table
	 * @param {object} parameters parameters
	 * @param {object} modelFields Model fields
	 * @returns {array}
	 */
	static getJoinsFields({ filters }, modelFields) {
		if(!filters)
			return [];

		let fields = [];

		const arrayFilters = Array.isArray(filters) ? [...filters] : [filters];

		arrayFilters.forEach(filter => {
			fields = [...fields, ...Object.keys(filter)];
		});

		return fields.filter(field => (modelFields[field] && modelFields[field].table));
	}

	/**
	 * Builds filters. Add AND or OR filters.
	 */
	static buildFilters(knex, model, parameters) {
		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);


		this.initModel(model);

		QueryBuilderFields.initModel(model);

		// eslint-disable-next-line prefer-destructuring
		const filters = parameters.filters;

		if(!filters)
			return;

		if(Array.isArray(filters))
			filters.forEach(filterItems => this._addOrFilters(filterItems, knex));
		else
			this._addAndFilters(filters, knex);
	}

	/**
	 * Adds OR filters. Calling Knex orWhere method
	 *
	 * @param {object} filters The filters
	 */
	static _addOrFilters(filters, knex) {
		knex.orWhere(builder => this._makeFilters(builder, filters));
	}

	/**
	 * Adds AND filters. Calling Knex where method
	 *
	 * @param {object} filters The filters
	 */
	static _addAndFilters(filters, knex) {
		knex.where(builder => this._makeFilters(builder, filters));
	}

	/**
	 * Makes filters. Calling Knex where methods
	 *
	 * @param {function} builder The Knex builder callback
	 * @param {object} filters The filters
	 */
	static _makeFilters(builder, filters) {

		for(const [fieldName, filter] of Object.entries(filters)) {

			if(!this._validateFilter(fieldName, filter))
				throw this.error;

			const filterMethod = this._getFilterMethod(fieldName, filter);

			const filterParams = this._getFilterParams(fieldName, filter);

			builder[filterMethod](...filterParams);
		}
	}

	/**
	 * Check if filter is valid
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content, value or object with definition
	 * @return {boolean} True if filter is valid, false otherwise
	 */
	static _validateFilter(fieldName, filter) {

		if(!QueryBuilderFields._validateField(fieldName, this.fields)) {
			this.error = new QueryBuilderError(`Unknown field '${fieldName}', check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_FIELDS);
			return false;
		}

		const filterType = this._getFilterType(fieldName, filter);

		if(!this._filterTypeExists(filterType)) {
			this.error = new QueryBuilderError(`Unknown filter type '${filterType}' for filter '${fieldName}'`,
				QueryBuilderError.codes.INVALID_FILTERS);
			return false;
		}

		const isMultiple = this._filterIsMultiple(fieldName, filter);

		if(isMultiple && !this._filterTypeAllowsMultipleValues(filterType)) {
			this.error = new QueryBuilderError(`Filter type '${filterType}' not allows multiple values for filter '${fieldName}'`,
				QueryBuilderError.codes.INVALID_FILTERS);
			return false;
		}

		const { needMultipleValues } = this.filterTypes[filterType];

		if(needMultipleValues) {

			// needMultipleValues es la cantidad de valores que "necesita" para filtrar

			if(!isMultiple) {
				this.error = new QueryBuilderError(`Filter type '${filterType}' needs multiple values for filter '${fieldName}'`,
					QueryBuilderError.codes.INVALID_FILTERS);
				return false;
			}

			const filterValue = this._getFilterValue(fieldName, filter);

			if(filterValue.length !== needMultipleValues) {
				this.error = new QueryBuilderError(`Filter type '${filterType}' must an array with 2 values for filter '${fieldName}'`,
					QueryBuilderError.codes.INVALID_FILTERS);
				return false;
			}
		}

		return true;
	}

	/**
	 * Gets the filter type.
	 *
	 * @param {string} fieldName The field name
	 * @param {object} filter The filter data
	 * @return {string} The filter type.
	 */
	static _getFilterType(fieldName, filter) {

		if(QueryBuilderFields._isFlagField(fieldName))
			return 'flagEqual';

		if(typeof filter === 'object' && filter.type)
			return filter.type;

		if(typeof this.fields[fieldName] === 'object' && this.fields[fieldName].type)
			return this.fields[fieldName].type;

		return 'equal';
	}

	/**
	 * Check if filter type exists
	 *
	 * @param {string} filterType The filter type
	 * @return {boolean} True if filter exists, false otherwise
	 */
	static _filterTypeExists(filterType) {
		return filterType && typeof filterType === 'string' && this.filterTypes[filterType];
	}

	/**
	 * Check if filter value is multiple
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content or value
	 * @return {boolean} true if is multiple, false otherwise
	 */
	static _filterIsMultiple(fieldName, filter) {
		return Array.isArray(this._getFilterValue(fieldName, filter));
	}

	/**
	 * Gets the filter value.
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content or value
	 * @return {mixed} The filter value.
	 */
	static _getFilterValue(fieldName, filter) {

		let value = filter.value || filter;

		if(QueryBuilderFields._isFlagField(fieldName))
			value = ['string', 'number', 'boolean'].includes(typeof value) ? value : QueryBuilderFields._getFlagData(fieldName).value;

		return value;
	}

	/**
	 * Prepares filter value
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content or value
	 * @return {mixed} filter value
	 */
	static _prepareFilterValue(fieldName, filter) {

		const filterType = this._getFilterType(fieldName, filter);
		const valuePrefix = this._getFilterValuePrefix(filterType);
		const valueSuffix = this._getFilterValueSuffix(filterType);

		const addPrefixAndSuffix = value => {
			if(valuePrefix)
				value = `${valuePrefix}${value}`;

			if(valueSuffix)
				value = `${value}${valueSuffix}`;

			return value;
		};

		const filterValue = this._getFilterValue(fieldName, filter);

		return this._filterIsMultiple(fieldName, filter) ? filterValue.map(addPrefixAndSuffix) : addPrefixAndSuffix(filterValue);
	}

	/**
	 * Check if filter allows multiple values
	 *
	 * @param {string} filterType The filter type
	 * @return {boolean} True if filter allows multiple values, false otherwise
	 */
	static _filterTypeAllowsMultipleValues(filterType) {
		return this._filterTypeExists(filterType) && this.filterTypes[filterType].multipleValues;
	}

	/**
	 * Check if should add filter value from filter type
	 *
	 * @param {string} filterType The filter type
	 * @return {boolean} True if should add filter value, false otherwise
	 */
	static _filterNeedsValue(filterType) {
		return this._filterTypeExists(filterType) && !this.filterTypes[filterType].noValueNeeded;
	}

	/**
	 * Gets the filter value prefix.
	 *
	 * @param {string} filterType The filter type
	 * @return {string|boolean} The filter value prefix if any, false otherwise
	 */
	static _getFilterValuePrefix(filterType) {
		return this._filterTypeExists(filterType) && this.filterTypes[filterType].valuePrefix ?
			this.filterTypes[filterType].valuePrefix : false;
	}

	/**
	 * Gets the filter value suffix.
	 *
	 * @param {string} filterType The filter type
	 * @return {string|boolean} The filter value suffix if any, false otherwise
	 */
	static _getFilterValueSuffix(filterType) {
		return this._filterTypeExists(filterType) && this.filterTypes[filterType].valueSuffix ?
			this.filterTypes[filterType].valueSuffix : false;
	}

	/**
	 * Gets the Knex filter method from a filter type.
	 *
	 * @param {string} fieldName The field name
	 * @param {object} filter The filter data
	 * @return {string} The filter Knex method name.
	 */
	static _getFilterMethod(fieldName, filter) {

		const filterType = this._getFilterType(fieldName, filter);

		const isMultiple = this._filterIsMultiple(fieldName, filter);

		if(isMultiple)
			return this.filterTypes[filterType].multipleMethod;

		return this.filterTypes[filterType].method || 'where';
	}

	/**
	 * Gets the filter parameters. Formatted field, operator if necesary and value if necesary
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter data
	 * @return {Array} The filter parameters.
	 */
	static _getFilterParams(fieldName, filter) {

		const filterParams = [
			QueryBuilderFields._getFormattedField(fieldName)
		];

		if(QueryBuilderFields._isFlagField(fieldName))
			filterParams[0] += ' = ?';

		const filterType = this._getFilterType(fieldName, filter);

		const filterOperator = this._getFilterOperator(filterType);

		if(filterOperator)
			filterParams.push(filterOperator);

		if(this._filterNeedsValue(filterType))
			filterParams.push(this._prepareFilterValue(fieldName, filter));

		return filterParams;
	}

	/**
	 * Gets the filter operator if any
	 *
	 * @param {string} filterType The filter type
	 * @return {(boolean|string)} The filter operator is any, false otherwise
	 */
	static _getFilterOperator(filterType) {
		return this.filterTypes[filterType].operator || false;
	}
}

module.exports = QueryBuilderFilters;
