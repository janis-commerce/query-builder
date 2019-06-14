'use strict';

const logger = require('@janiscommerce/logger');

const Utils = require('./../utils');

const QueryBuilderError = require('./query-builder-error');

const JOIN_DEFAULT_METHOD = 'left';
const JOIN_DEFAULT_OPERATOR = '=';
const DATE_FIELDS = ['date_modified', 'date_created'];

class QueryBuilder {

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

	static get selectFunctions() {
		return {
			count: 'count',
			min: 'min',
			max: 'max',
			sum: 'sum',
			avg: 'avg'
		};
	}

	static get joinMethods() {
		return {
			join: 'join',
			inner: 'innerJoin',
			left: 'leftJoin', // default
			leftOuter: 'leftOuter',
			right: 'rightJoin',
			rightOuter: 'rightOuterJoin',
			fullOuter: 'fullOuterJoin',
			cross: 'crossJoin'
		};
	}

	static get joinOperators() {
		return ['=', '!='];
	}

	static get dateFields() {
		return DATE_FIELDS;
	}

	/**
	 * Query Builder Constructor
	 * @param {function} knex Knex instance Initializated
	 * @param {class} model Instance of Model
	 * @param {object} params Parametres
	 */
	constructor(knex, model) {

		if(!knex || !knex.raw)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

		this.knex = knex;
		this.model = model;

		this.modelName = model.constructor.name;

		this.table = model.constructor.table;
		this.fields = model.constructor.fields;
		this.flags = model.constructor.flags;
		this.joins = model.constructor.joins;
	}

	/**
	 * Build query parameters
	 *
	 */
	_build() {

		this._init();

		this._buildSelect();

		if(this._modelHasFieldsStructure()) {
			this._buildJoins();
			this._buildFilters();
			this._buildOrder();
			this._buildGroup();
		} else
			logger.warn('QueryBuilder - No fields structure');

		this._buildLimit();

		if(this.params.debug)
			logger.info('statement', this.knexStatement.toString());
	}

	/**
	 * Initializes the Query Builder, creates the Knex Statement with table
	 *
	 */
	_init() {

		const { table = this.table } = this.params;
		this.knexStatement = this.knex({ t: this.model.addDbName(table) });
		this.knexStatement.raw = this.knex.raw;
	}

	/**
	 * Initializes Knex with the Table without Alias.
	 */
	_initWithoutAlias() {

		this.knexStatement = this.knex(this.model.addDbName(this.table));
		this.knexStatement.raw = this.knex.raw;
	}

	/**
	 * Indicates if Model has fields structure
	 *
	 * @return {boolean} true if has structure, false otherwise
	 */
	_modelHasFieldsStructure() {
		return this.fields && Object.keys(this.fields).length > 0;
	}

	/**
	 * Build Select. Call Knex Select with fields in params
	 *
	 */
	_buildSelect() {

		const { fields } = this.params;

		let fieldsForSelect;
		let flagFieldsForSelect = false;

		if(typeof fields === 'undefined') {
			fieldsForSelect = 't.*';

			if(typeof this.params.noFlags === 'undefined' || !this.params.noFlags)
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
			this.knexStatement.select(fieldsForSelect);
			nothingToSelect = false;
		}

		if(flagFieldsForSelect) {
			flagFieldsForSelect = Object.values(flagFieldsForSelect).join(', ');
			this.knexStatement.select(this.knexStatement.raw(flagFieldsForSelect));
			nothingToSelect = false;
		}

		const selectFunctions = this._getSelectFunctions();

		for(const selectFunction of selectFunctions) {
			this.knexStatement[selectFunction.method](selectFunction.select);
			nothingToSelect = false;
		}

		if(nothingToSelect)
			throw new QueryBuilderError('Nothing to select', QueryBuilderError.codes.NO_SELECT);
	}

	/**
	 * Validate fields
	 *
	 * @param {array} fields The fields
	 * @return {boolean} true if valid, throw otherwise
	 */
	_validateFields(fields) {

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
	_validateField(fieldName) {

		if(!this._fieldExists(fieldName)) {
			this.error = new QueryBuilderError(`Unknown field '${fieldName}', check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_FIELDS);
			return false;
		}

		return true;
	}

	/**
	 * Check if field exists
	 *
	 * @param {string} fieldName The field name
	 * @return {Boolean} true if exists, false otherwise
	 */
	_fieldExists(fieldName) {
		return typeof this.fields[fieldName] !== 'undefined';
	}

	/**
	 * Gets the flag fields for the actual model.
	 *
	 * @return {Array} The flag fields.
	 */
	_getFlagFields() {

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
	_getFieldsForSelect(fields) {

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
	_isFlagField(fieldName) {

		const flagData = this._getFlagData(fieldName);

		return flagData !== false;
	}


	/**
	 * Gets the flag data.
	 *
	 * @param {string} fieldName The field name
	 * @return {(Object|false)} The flag data or false if not a flag.
	 */
	_getFlagData(fieldName) {

		if(typeof this.flags === 'undefined')
			return false;

		for(const [field, flags] of Object.entries(this.flags)) {
			for(const [flag, flagValue] of Object.entries(flags)) {
				if(fieldName !== flag)
					continue;

				if(!this._validateField(field))
					throw new QueryBuilderError(this.error, QueryBuilderError.INVALID_FIELDS);

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
	_getAliasForSelect(fieldName) {
		return typeof this.fields[fieldName] === 'object' && this.fields[fieldName].alias ? this.fields[fieldName].alias : fieldName;
	}

	/**
	 * Gets the field correct string to select, filter or order
	 *
	 * @param {string} fieldName The field name
	 * @return {string} The formatted field.
	 */
	_getFormattedField(fieldName) {

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
	_getTableAliasFromField(fieldName) {

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
	_getRealFieldName(fieldName) {

		const field = this.fields[fieldName];

		if(typeof field === 'boolean')
			return fieldName;

		if(typeof field === 'string')
			return field;

		if(typeof field === 'object' && field.field && typeof field.field === 'string')
			return field.field;

		return fieldName;
	}

	_getFlagFieldsForSelect(fields) {

		const flagFieldsForSelect = {};

		fields.forEach(fieldName => {

			if(!this._isFlagField(fieldName))
				return;

			const { value } = this._getFlagData(fieldName);

			flagFieldsForSelect[fieldName] = `(${this._getFormattedFlagField(fieldName)} = ${value}) as ${fieldName}`;
		});

		return Object.keys(flagFieldsForSelect).length ? flagFieldsForSelect : false;
	}

	_getFormattedFlagField(fieldName) {

		const { field, value } = this._getFlagData(fieldName);

		return `(${this._getTableAliasFromField(field)}.${this._getRealFieldName(field)} & ${value})`;
	}

	/**
	 * Gets the select functions.
	 *
	 * @return {(Object|boolean)} The select functions.
	 */
	_getSelectFunctions() {

		const selectFunctions = [];

		for(const [selectFunction, selectMethod] of Object.entries(this.constructor.selectFunctions)) {

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

	/**
	 * Build Joins.
	 */
	_buildJoins() {

		const { joins } = this.params;

		if(!joins)
			return;

		if(!Array.isArray(joins))
			throw new QueryBuilderError('Param \'joins\' must be an array', QueryBuilderError.codes.INVALID_JOINS);

		joins.forEach(joinKey => this._makeJoin(joinKey));
	}

	/**
	 * Add a single join.
	 *
	 * @param {string} joinKey The join key
	 */
	_makeJoin(joinKey) {

		if(!this._validateJoin(joinKey))
			throw this.error;

		const joinTable = this._getJoinTable(joinKey);
		const joinMethod = this._getJoinMethod(joinKey);

		this.knexStatement[joinMethod](joinTable, builder => {

			const modelJoin = this.joins[joinKey];

			if(modelJoin.multipleOn) {

				const onMethod = modelJoin.on ? 'on' : 'orOn';

				modelJoin[onMethod].forEach(onItem => {
					const joinFields = this._getFormattedJoinFields(onItem);
					builder[onMethod](...joinFields);
				});
			} else {
				const joinFields = this._getFormattedJoinFields(modelJoin.on);
				builder.on(...joinFields);
			}
		});
	}


	/**
	 * Validates the join structure
	 *
	 * @param {string} joinKey The join key
	 * @return {boolean} true if valid, false otherwise
	 */
	_validateJoin(joinKey) {

		if(!this._joinExists(joinKey)) {
			this.error = new QueryBuilderError(`Unknown joinKey '${joinKey}', check ${this.modelName}.joins`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		const modelJoin = this.joins[joinKey];

		if(typeof modelJoin !== 'object') {
			this.error = new QueryBuilderError(`join '${joinKey}' must be an object, check ${this.modelName}.joins.${joinKey}`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		if(!modelJoin.alias) {
			this.error = new QueryBuilderError(`join '${joinKey}' 'alias' is required, check ${this.modelName}.joins.${joinKey}`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		if(modelJoin.method && !this._joinMethodExists(modelJoin.method)) {
			this.error = new QueryBuilderError(`invalid join method '${modelJoin.method}', check QueryBuilder.joinMethods`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		if(!modelJoin.on && !modelJoin.orOn) {
			this.error = new QueryBuilderError(`join '${joinKey}' 'on' or 'orOn' are required, check ${this.modelName}.joins.${joinKey}`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		if(modelJoin.on)
			return this._validateJoinOn(joinKey);

		return this._validateJoinOn(joinKey, 'orOn');
	}

	/**
	 * Indicates if join exists
	 *
	 * @param {string} joinKey The join key
	 * @return {Boolean} true if exists, false otherwise
	 */
	_joinExists(joinKey) {
		return typeof this.joins[joinKey] !== 'undefined';
	}

	/**
	 * Indicates if join method exists
	 *
	 * @param {string} joinMethod The join method
	 * @return {Boolean} true if exists, false otherwise
	 */
	_joinMethodExists(joinMethod) {
		return typeof this.constructor.joinMethods[joinMethod] !== 'undefined';
	}

	/**
	 * Indicates if operator is valid
	 *
	 * @param {string} operator The join operator
	 * @return {boolear} true if valid operator, false otherwise
	 */
	_validateJoinOperator(operator) {

		if(!this.constructor.joinOperators.includes(operator)) {
			this.error = new QueryBuilderError(`Unknown join operator '${operator}'`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		return true;
	}

	/**
	 * Validates Joins 'on' part
	 *
	 * @param {string} joinKey The join key
	 * @param {string} type The type
	 * @return {boolean} true if valid, false otherwise
	 */
	_validateJoinOn(joinKey, type = 'on') {

		const on = this.joins[joinKey][type];

		if(!Array.isArray(on)) {
			this.error = new QueryBuilderError(`join '${joinKey}' parts 'on' and 'orOn' must be an array, check ${this.modelName}.joins.${joinKey}`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		if(!on.length) {
			/* eslint-disable max-len */
			this.error = new QueryBuilderError(`join '${joinKey}' parts 'on' and 'orOn' must be an array with content, check ${this.modelName}.joins.${joinKey}`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		if(on.every(joinField => typeof joinField === 'string'))
			return this._validateJoinFields(joinKey, on);

		if(on.every(joinFields => Array.isArray(joinFields))) {
			this.joins[joinKey].multipleOn = true;
			return on.every(joinFields => this._validateJoinFields(joinKey, joinFields));
		}

		/* eslint-disable max-len */
		this.error = new QueryBuilderError(`join '${joinKey}' parts 'on' and 'orOn' must be an arrays or strings, check ${this.modelName}.joins.${joinKey}`,
			QueryBuilderError.codes.INVALID_JOINS);
		return false;
	}

	/**
	 * Validates Joins 'fields' part
	 *
	 * @param {string} joinKey The join key
	 * @param {array} joinFields the join fields
	 * @return {boolean} true if valid fields, false otherwise
	 */
	_validateJoinFields(joinKey, joinFields) {

		if(joinFields.length !== 2 && joinFields.length !== 3) {
			this.error = new QueryBuilderError(`join '${joinKey}' parts 'on' and 'orOn' must have 2 o 3 values, check ${this.modelName}.joins.${joinKey}`,
				QueryBuilderError.codes.INVALID_JOINS);
			return false;
		}

		let operator = JOIN_DEFAULT_OPERATOR;
		let fieldA;
		let fieldB;

		if(joinFields.length === 2)
			[fieldA, fieldB] = joinFields;
		else
			[fieldA, operator, fieldB] = joinFields;

		return this._validateField(fieldA)
			&& !this._isFlagField(fieldA)
			&& this._validateJoinOperator(operator)
			&& this._validateField(fieldB)
			&& !this._isFlagField(fieldB);
	}

	/**
	 * Gets the join method.
	 *
	 * @param {string} joinKey The join key
	 * @return {string} The join method.
	 */
	_getJoinMethod(joinKey) {
		const joinMethod = this.joins[joinKey].method || JOIN_DEFAULT_METHOD;
		return this.constructor.joinMethods[joinMethod];
	}

	/**
	 * Gets the join table.
	 *
	 * @param {string} joinKey The join key
	 * @return {string} The join table.
	 */
	_getJoinTable(joinKey) {
		const modelJoin = this.joins[joinKey];
		const table = modelJoin.table || joinKey;
		return `${this.model.addDbName(table)} as ${modelJoin.alias}`;
	}

	/**
	 * Gets the formatted join fields.
	 *
	 * @param {array} joinFields The join fields
	 * @return {array} The formatted join fields.
	 */
	_getFormattedJoinFields(joinFields) {
		return joinFields.map(joinField => {
			return this._fieldExists(joinField) ? this._getFormattedField(joinField) : joinField;
		});
	}

	/**
	 * Builds filters. Add AND or OR filters.
	 */
	_buildFilters() {

		const { filters } = this.params;

		if(!filters)
			return;

		if(Array.isArray(filters))
			filters.forEach(filterItems => this._addOrFilters(filterItems));
		else
			this._addAndFilters(filters);
	}

	/**
	 * Adds OR filters. Calling Knex orWhere method
	 *
	 * @param {object} filters The filters
	 */
	_addOrFilters(filters) {
		this.knexStatement.orWhere(builder => this._makeFilters(builder, filters));
	}

	/**
	 * Adds AND filters. Calling Knex where method
	 *
	 * @param {object} filters The filters
	 */
	_addAndFilters(filters) {
		this.knexStatement.where(builder => this._makeFilters(builder, filters));
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

		if(!this._validateField(fieldName))
			return false;

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

		if(this._isFlagField(fieldName))
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

		if(this._isFlagField(fieldName))
			value = value ? this._getFlagData(fieldName).value : 0;

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
		return this._filterTypeExists(filterType) && this.constructor.filterTypes[filterType].valuePrefix ? this.constructor.filterTypes[filterType].valuePrefix : false;
	}

	/**
	 * Gets the filter value suffix.
	 *
	 * @param {string} filterType The filter type
	 * @return {string|boolean} The filter value suffix if any, false otherwise
	 */
	_getFilterValueSuffix(filterType) {
		return this._filterTypeExists(filterType) && this.constructor.filterTypes[filterType].valueSuffix ? this.constructor.filterTypes[filterType].valueSuffix : false;
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
			this._getFormattedField(fieldName)
		];

		if(this._isFlagField(fieldName))
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

	/**
	 * Build Order By. Call Knex orderBy with order in params
	 *
	 */
	_buildOrder() {

		let { order } = this.params;

		if(!order)
			return;

		if(typeof order === 'string')
			order = { [order]: 'asc' };

		if(Array.isArray(order))
			throw new QueryBuilderError('Param order must be an object or string', QueryBuilderError.codes.INVALID_ORDERS);

		for(const [fieldName, direction] of Object.entries(order)) {

			if(!this._validateOrderItem(fieldName, direction))
				throw this.error;

			const formattedField = this._getFormattedField(fieldName);

			if(this._isFlagField(fieldName))
				this.knexStatement.orderByRaw(`${formattedField} ${direction}`);
			else
				this.knexStatement.orderBy(formattedField, direction);
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

		if(!this._validateField(fieldName))
			return false;

		if(direction !== 'asc' && direction !== 'desc') {
			this.error = new QueryBuilderError(`Order By direccion must be 'asc' or 'desc', direction received '${direction}'`,
				QueryBuilderError.codes.INVALID_ORDERS);
			return false;
		}

		return true;
	}

	/**
	 * Builds group by function.
	 *
	 */
	_buildGroup() {

		let { group } = this.params;

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

			const formattedField = this._getFormattedField(fieldName);

			if(this._isFlagField(fieldName))
				this.knexStatement.groupByRaw(formattedField);
			else
				this.knexStatement.groupBy(formattedField);
		});
	}

	/**
	 * Validates a group item
	 *
	 * @param {string} fieldName The field name
	 * @return {boolean} true if valid, false otherwise
	 */
	_validateGroupItem(fieldName) {

		if(!this._validateField(fieldName))
			return false;

		return true;
	}

	/**
	 * Build Limit and Offset. Call Knex limit and offset methods with params
	 *
	 */
	_buildLimit() {

		let { limit } = this.params;

		if(limit) {

			limit = Number(limit);

			if(!Number.isNaN(limit) || Number.isInteger(limit))
				this.knexStatement.limit(limit);
			else
				throw new QueryBuilderError('Invalid \'limit\' format, \'limit\' must be an integer', QueryBuilderError.codes.INVALID_LIMITS);
		}

		let { page } = this.params;

		if(page) {

			page = Number(page);

			if(Number.isNaN(page) || !Number.isInteger(page))
				throw new QueryBuilderError('Invalid \'page\' format, \'page\' must be an integer', QueryBuilderError.codes.INVALID_LIMITS);

			if(!limit)
				throw new QueryBuilderError('Param \'limit\' is required when param page given', QueryBuilderError.codes.INVALID_LIMITS);

			const offset = (page - 1) * limit;

			this.knexStatement.offset(offset);
		} else {

			let { offset } = this.params;

			if(!offset)
				return;

			offset = Number(offset);

			if(Number.isNaN(offset) || !Number.isInteger(offset))
				throw new QueryBuilderError('Invalid \'offset\' format, \'offset\' must be an integer', QueryBuilderError.codes.INVALID_LIMITS);

			this.knexStatement.offset(offset);
		}
	}

	/**
	 * Search objets in the Database.
	 * @param {objects} parametres Object with Parametres and filters
	 * @return {Promise<Array>} Array of Objects in Database
	 */
	async get(parametres = {}) {

		this.params = parametres;
		this._build();
		return this.knexStatement;
	}

	/**
	 * Creates a new Array of items with only Fields found in Table
	 * @param {Array<objects>} items Array of Objects
	 */

	async _formatFields(items) {

		const tableFields = Object.keys(await this._getFields());

		return items.map(item => {

			const time = (Date.now() / 1000 | 0);

			const validFields = {};

			tableFields.forEach(field => {
				validFields[field] = item[field] || (this.constructor.dateFields.includes(field) ? time : null);
			});

			return validFields;

		});
	}

	/**
	 * Creates the String for Upserts Inserts.
	 */
	async _upsertFormatFields() {
		const tableFields = Object.keys(await this._getFields());

		const duplicateKey = 'ON DUPLICATE KEY UPDATE ';

		const fields = tableFields.filter(element => element !== 'date_created').map(field => {
			if(field === 'id')
				return 'id = LAST_INSERT_ID(id)';
			return `${field} = VALUES(${field})`;
		});

		return duplicateKey + fields.join(', \n');
	}

	/**
	 * Format and filter Values to use in update.
	 * @param {object} values
	 * @returns {object}
	 */
	async _formatUpdateValues(values) {

		const tableFields = [...Object.keys(await this._getFields())];
		const valuesFields = Object.keys(values);

		const validFields = {};

		valuesFields.forEach(field => {
			if(tableFields.includes(field))
				validFields[`t.${field}`] = values[field];
		});

		return validFields;

	}

	/**
	 * Change the table alias to another.
	 * By Default changes `t` to model table name.
	 * @param {String} queryToDelete Query with alias fields
	 * @param {String} newName new Name, Default Model Table Name
	 * @param {String} formerName Former Table Alias, Default 't'
	 * @returns {String} Complete Query with the changes
	 */
	_changeQueryTableAlias(queryToChange, newName = this.table, formerName = 't') {
		return queryToChange.split(`\`${formerName}\``).join(`\`${newName}\``); // replace not work for many replaces
	}

	/**
	 * Insert into Database new elements
	 * @param {Array<object>} items Array of Objects to insert
	 * @returns {Array} [0] si esta todo bien.
	 */
	async insert(items) {

		this._initWithoutAlias();

		// Check if Items is an Array
		if(!items || !items.length) {
			// if it's not, but it's an individual element
			if(items && typeof items === 'object')
				items = [items];
			else
				throw new QueryBuilderError('Not valid items to Insert', QueryBuilderError.codes.NO_ITEMS);
		}
		// Format Items to have valid fields
		items = await this._formatFields(items);

		return this.knexStatement.insert(items);

	}

	/**
	 * Save into Database, with Upsert (if some element exist created a new one)
	 * @param {Array<objects>} items Array of objects to save
	 * @returns {Array<objects>} index 0: Results-Headers object
	 */
	async save(items) {

		this._initWithoutAlias();

		// Check if Items is an Array
		if(!items || !items.length) {
			// if it's not, but it's an individual element
			if(items && typeof items === 'object')
				items = [items];
			else
				throw new QueryBuilderError('Not valid items to Save', QueryBuilderError.codes.NO_ITEMS);
		}
		// Format Items to have valid fields
		items = await this._formatFields(items);

		let query = this.knexStatement.insert(items).toString();

		query += await this._upsertFormatFields();

		return this.knexStatement.raw(query);
	}

	/**
	 * Update rows.
	 * @param {object} values Values to change.
	 * @param {object} filters Filters (Where).
	 * @returns {Array<objects>} index 0: Results-Headers object
	 */
	async update(values, filters) {

		if(!values || typeof values !== 'object')
			throw new QueryBuilderError('No values to Update', QueryBuilderError.codes.NO_VALUES);

		this.params = {};

		this._init();

		this.params = {
			filters
		};

		values = await this._formatUpdateValues(values);

		this._buildFilters();

		this.knexStatement = this.knexStatement.update(values);

		return this.knexStatement;
	}

	/**
	 * Delete rows from Database.
	 * @param {object} filters Object with filters. (Where)
	 * @param {object} joins Object with Joins.
	 * @returns {Promise<Array>} Array of Objects, index 0: Results-Headers object
	 */
	async remove(filters, joins) {

		this._initWithoutAlias();

		this.params = {
			filters,
			joins
		};
		// Builds the Filters (Where)
		this._buildFilters();
		// Builds the Joins
		this._buildJoins();
		// Necesary to use Knex, otherwise fails.
		const deleteQuereyRaw = this._changeQueryTableAlias(this.knexStatement.del().toString());

		return this.knexStatement.raw(deleteQuereyRaw).toString();
	}

	/**
	 * Get Fields from Table in database
	 */
	async _getFields() {
		const table = this.model.addDbName(this.table);
		let rows;

		try {
			[rows] = await this.knex.raw(`SHOW COLUMNS FROM ${table};`);
		} catch(error) {
			throw new QueryBuilderError('Can\'t get Table information from Database', QueryBuilderError.codes.INVALID_TABLE);
		}

		const fields = {};
		for(const field of rows)
			fields[field.Field] = field;

		return fields;
	}

}

module.exports = QueryBuilder;
