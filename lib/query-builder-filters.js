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
	constructor(model) {

		this.modelName = model.constructor.name;
		this.fields = model.constructor.fields;
		this.flags = model.constructor.flags;

		this.queryBuilderFields = new QueryBuilderFields(model);
	}

	/**
	 * Search in the filters parameters and return fields that have to join on a table
	 * @param {object} parameters parameters
	 * @param {object} modelFields Model fields
	 * @returns {array}
	 */
	getJoinsFields({ filters }, modelFields) {
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
	buildFilters(knex, model, parameters) {
		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

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
	_addOrFilters(filters, knex) {
		knex.orWhere(builder => this._makeFilters(builder, filters));
	}

	/**
	 * Adds AND filters. Calling Knex where method
	 *
	 * @param {object} filters The filters
	 */
	_addAndFilters(filters, knex) {
		knex.where(builder => this._makeFilters(builder, filters));
	}

	/**
	 * Makes filters. Calling Knex where methods
	 *
	 * @param {function} builder The Knex builder callback
	 * @param {object} filters The filters
	 */
	_makeFilters(builder, filters) {

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
	_validateFilter(fieldName, filter) {

		if(!this.queryBuilderFields._validateField(fieldName, this.fields)) {
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

		const { needMultipleValues } = this.constructor.filterTypes[filterType];

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
	_getFilterType(fieldName, filter) {

		if(this.queryBuilderFields._isFlagField(fieldName))
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
	_filterTypeExists(filterType) {
		return filterType && typeof filterType === 'string' && this.constructor.filterTypes[filterType];
	}

	/**
	 * Check if filter value is multiple
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content or value
	 * @return {boolean} true if is multiple, false otherwise
	 */
	_filterIsMultiple(fieldName, filter) {
		return Array.isArray(this._getFilterValue(fieldName, filter));
	}

	/**
	 * Gets the filter value.
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content or value
	 * @return {mixed} The filter value.
	 */
	_getFilterValue(fieldName, filter) {

		let value = filter.value || filter;

		if(this.queryBuilderFields._isFlagField(fieldName))
			value = !value || value === '0' || value === 'false' ? 0 : this.queryBuilderFields._getFlagData(fieldName).value;

		return value;
	}

	/**
	 * Prepares filter value
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter content or value
	 * @return {mixed} filter value
	 */
	_prepareFilterValue(fieldName, filter) {

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
	_filterTypeAllowsMultipleValues(filterType) {
		return this._filterTypeExists(filterType) && this.constructor.filterTypes[filterType].multipleValues;
	}

	/**
	 * Check if should add filter value from filter type
	 *
	 * @param {string} filterType The filter type
	 * @return {boolean} True if should add filter value, false otherwise
	 */
	_filterNeedsValue(filterType) {
		return this._filterTypeExists(filterType) && !this.constructor.filterTypes[filterType].noValueNeeded;
	}

	/**
	 * Gets the filter value prefix.
	 *
	 * @param {string} filterType The filter type
	 * @return {string|boolean} The filter value prefix if any, false otherwise
	 */
	_getFilterValuePrefix(filterType) {
		return this._filterTypeExists(filterType) && this.constructor.filterTypes[filterType].valuePrefix ?
			this.constructor.filterTypes[filterType].valuePrefix : false;
	}

	/**
	 * Gets the filter value suffix.
	 *
	 * @param {string} filterType The filter type
	 * @return {string|boolean} The filter value suffix if any, false otherwise
	 */
	_getFilterValueSuffix(filterType) {
		return this._filterTypeExists(filterType) && this.constructor.filterTypes[filterType].valueSuffix ?
			this.constructor.filterTypes[filterType].valueSuffix : false;
	}

	/**
	 * Gets the Knex filter method from a filter type.
	 *
	 * @param {string} fieldName The field name
	 * @param {object} filter The filter data
	 * @return {string} The filter Knex method name.
	 */
	_getFilterMethod(fieldName, filter) {

		const filterType = this._getFilterType(fieldName, filter);

		const isMultiple = this._filterIsMultiple(fieldName, filter);

		if(isMultiple)
			return this.constructor.filterTypes[filterType].multipleMethod;

		return this.constructor.filterTypes[filterType].method || 'where';
	}

	/**
	 * Gets the filter parameters. Formatted field, operator if necesary and value if necesary
	 *
	 * @param {string} fieldName The field name
	 * @param {mixed} filter The filter data
	 * @return {Array} The filter parameters.
	 */
	_getFilterParams(fieldName, filter) {

		const filterParams = [
			this.queryBuilderFields._getFormattedField(fieldName)
		];

		if(this.queryBuilderFields._isFlagField(fieldName))
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
	_getFilterOperator(filterType) {
		return this.constructor.filterTypes[filterType].operator || false;
	}
}

module.exports = QueryBuilderFilters;
