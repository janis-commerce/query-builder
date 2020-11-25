'use strict';

const logger = require('@janiscommerce/logger');

const QueryBuilderError = require('./query-builder-error');

const QueryBuilderSelect = require('./query-builder-fields');
const QueryBuilderJoins = require('./query-builder-joins');
const QueryBuilderFilters = require('./query-builder-filters');
const QueryBuilderGroup = require('./query-builder-group');
const QueryBuilderOrder = require('./query-builder-order');
const QueryBuilderPagination = require('./query-builder-pagination');
const { convertToSnakeCase, convertToCamelCase } = require('./utils');

const DATE_CREATED = 'date_created';
const DATE_MODIFIED = 'date_modified';

class QueryBuilder {

	static get dateModified() {
		return DATE_MODIFIED;
	}

	static get dateFields() {
		return [DATE_CREATED, DATE_MODIFIED];
	}

	/**
	 * Query Builder Constructor
	 * @param {function} knex Knex instance Initializated
	 * @param {class} model Instance of Model
	 * @param {object} parameters parameters
	 */
	constructor(knex, model) {

		if(!knex || !knex.raw)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

		this.knex = knex;
		this.model = model;

		this.table = model.constructor.table;
		this.fields = model.constructor.fields || {};

		this.queryBuilderSelect = new QueryBuilderSelect(model);
		this.queryBuilderFilters = new QueryBuilderFilters(model);
		this.queryBuilderOrder = new QueryBuilderOrder(model);
		this.queryBuilderJoins = new QueryBuilderJoins(model);
		this.queryBuilderGroup = new QueryBuilderGroup(model);
		this.queryBuilderPagination = QueryBuilderPagination;
	}

	/**
	 * Initializes the Query Builder, creates the Knex Statement with table
	 *
	 */
	_init() {

		this.knexStatement = this.knex({ t: this.table });
		this.knexStatement.raw = this.knex.raw.bind(this.knex);
	}

	/**
	 * Initializes Knex with the Table without Alias.
	 */
	_initWithoutAlias() {

		this.knexStatement = this.knex(this.table);
		this.knexStatement.raw = this.knex.raw.bind(this.knex);
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
	 * Search objets in the Database.
	 * @param {objects} parameters Object with parameters and filters
	 * @return {Promise<Array>} Array of Objects in Database
	 */
	async get(parameters = {}) {

		this.parameters = this.prepareParams(parameters);

		this._init();

		this.queryBuilderSelect.buildSelect(this.knexStatement, this.model, this.parameters);

		if(this._modelHasFieldsStructure()) {
			this.queryBuilderJoins.buildJoins(this.knexStatement, this.model, this.parameters);
			this.queryBuilderFilters.buildFilters(this.knexStatement, this.model, this.parameters);
			this.queryBuilderOrder.buildOrder(this.knexStatement, this.model, this.parameters);
			this.queryBuilderGroup.buildGroup(this.knexStatement, this.model, this.parameters);
		} else
			logger.warn('QueryBuilder - No fields structure');

		this.queryBuilderPagination.buildLimit(this.knexStatement, this.parameters);

		if(this.parameters.debug)
			logger.info('statement', this.knexStatement.toString());

		return this.knexStatement;
	}

	/**
	 * Creates a new Array of items with only Fields found in Table
	 * @param {Array<objects>} items Array of Objects
	 */

	async _getFormatFields(items) {

		const tableFields = Object.keys(await this._getFields());

		return items.map(item => {

			const validFields = {};

			tableFields.forEach(field => {

				if(item[convertToCamelCase(field)] !== undefined)
					validFields[field] = item[convertToCamelCase(field)];
			});

			return validFields;

		});
	}

	/**
	 * Creates the String for Upserts Inserts.
	 */
	async _upsertFormatFields(isMultiple) {
		const tableFields = Object.keys(await this._getFields());

		const duplicateKey = ' ON DUPLICATE KEY UPDATE ';

		const fields = tableFields.filter(element => element !== 'date_created').map(field => {
			if(field === 'id' && !isMultiple)
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
			if(tableFields.includes(convertToSnakeCase(field)))
				validFields[`t.${field}`] = values[field];
		});

		validFields[`t.${this.constructor.dateModified}`] = (Date.now() / 1000 | 0);

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
		items = await this._getFormatFields(items);

		try {
			return this.knexStatement.insert(items);

		} catch(error) {
			throw new QueryBuilderError(error.code || error, QueryBuilderError.codes.DRIVER_ERROR);
		}

	}

	/**
	 * Save into Database, with Upsert (if some element exist created a new one)
	 * @param {Array<objects>} items Array of objects to save
	 * @returns {Array<objects>} index 0: Results-Headers object
	 */
	async save(items) {

		const isMultiple = Array.isArray(items) && items.length > 1;

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
		items = await this._getFormatFields(items);

		try {

			let query = this.knexStatement.insert(items).toString();

			query += await this._upsertFormatFields(isMultiple);

			return this.knexStatement.raw(query);

		} catch(error) {

			throw new QueryBuilderError(error.code || error, QueryBuilderError.codes.DRIVER_ERROR);
		}
	}

	/**
	 * Update rows.
	 * @param {object} values Values to change.
	 * @param {object} filters Filters (Where).
	 * @returns {number} Return the number of rows affected or nothing
	 */
	async update(values, filters) {

		if(!values || typeof values !== 'object')
			throw new QueryBuilderError('No values to Update', QueryBuilderError.codes.NO_VALUES);

		this.parameters = this.prepareParams({ filters });

		this._init();

		values = await this._formatUpdateValues(values);
		try {
			this.queryBuilderFilters.buildFilters(this.knexStatement, this.model, this.parameters);
			return this.knexStatement.update(values);

		} catch(error) {
			if(error.name === 'QueryBuilderError')
				throw error;

			throw new QueryBuilderError(error.code || error, QueryBuilderError.codes.DRIVER_ERROR);
		}
	}

	/**
	 * Delete rows from Database.
	 * @param {object} filters Object with filters. (Where)
	 * @returns {Promise<Array>} Array of Objects, index 0: Results-Headers object
	 */
	async remove(filters) {

		this._initWithoutAlias();

		this.parameters = this.prepareParams({ filters });

		try {

			// Builds the Filters (Where)
			this.queryBuilderFilters.buildFilters(this.knexStatement, this.model, this.parameters);
			// Builds the Joins
			this.queryBuilderJoins.buildJoins(this.knexStatement, this.model, this.parameters);
			// Necesary to use Knex, otherwise fails.
			const deleteQuereyRaw = this._changeQueryTableAlias(this.knexStatement.del().toString());

			return this.knexStatement.raw(deleteQuereyRaw);

		} catch(error) {

			if(error.name === 'QueryBuilderError')
				throw error;

			throw new QueryBuilderError(error.code || error, QueryBuilderError.codes.DRIVER_ERROR);
		}
	}

	/**
	 * Get Fields from Table in database
	 */
	async _getFields() {

		let rows;

		try {
			[rows] = await this.knex.raw(`SHOW COLUMNS FROM ${this.table};`);
		} catch(error) {
			throw new QueryBuilderError('Can\'t get Table information from Database', QueryBuilderError.codes.INVALID_TABLE);
		}

		const fields = {};

		// If Rows format is an array (no post-process in Knex Config, by Default)
		if(Array.isArray(rows)) {
			for(const field of rows)
				fields[field.Field] = field;
		} else {
			// If Rows format is an Object (post-process in Knex Config)
			Object.entries(rows).forEach(([field, value]) => {
				fields[rows[field].Field] = value;
			});
		}

		return fields;
	}

	/**
	 * Prepare parameters to automatic add Joins (if required)
	 * @param {object} parameters
	 * @returns {object}
	 */
	prepareParams(parameters) {

		// to ignore previous joins
		delete parameters.joins;
		// If no parameters.
		if(!Object.keys(parameters).length)
			return parameters;

		// Filter the parameters which have a join option
		const fields = [
			...this.queryBuilderSelect.getJoinsFields(parameters, this.fields),
			...this.queryBuilderSelect.getJoinsSpecialFunction(parameters, this.fields),
			...this.queryBuilderFilters.getJoinsFields(parameters, this.fields),
			...this.queryBuilderOrder.getJoinsFields(parameters, this.fields),
			...this.queryBuilderGroup.getJoinsFields(parameters, this.fields)
		];

		// Get Unique Tables
		parameters.joins = [...new Set(fields.map(field => this.fields[field].table))];

		// Delete Joins if it's empty
		if(!parameters.joins.length)
			delete parameters.joins;

		return parameters;
	}

}

module.exports = QueryBuilder;
