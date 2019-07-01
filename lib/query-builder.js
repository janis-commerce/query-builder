'use strict';

const logger = require('@janiscommerce/logger');

const QueryBuilderError = require('./query-builder-error');

const QueryBuilderSelect = require('./query-builder-fields');
const QueryBuilderJoins = require('./query-builder-joins');
const QueryBuilderFilters = require('./query-builder-filters');
const QueryBuilderGroup = require('./query-builder-group');
const QueryBuilderOrder = require('./query-builder-order');
const QueryBuilderPagination = require('./query-builder-pagination');

const DATE_FIELDS = ['date_modified', 'date_created'];

class QueryBuilder {

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

		this.table = model.constructor.table;
		this.fields = model.constructor.fields;
	}

	/**
	 * Build query parameters
	 *
	 */
	/* 	_build() {

		this._init();

		QueryBuilderSelect.buildSelect(this.knexStatement, this.model, this.params);

		if(this._modelHasFieldsStructure()) {
			QueryBuilderJoins.buildJoins(this.knexStatement, this.model, this.params);
			QueryBuilderFilters.buildFilters(this.knexStatement, this.model, this.params);
			QueryBuilderOrder.buildOrder(this.knexStatement, this.model, this.params);
			QueryBuilderGroup.buildGroup(this.knexStatement, this.model, this.params);
		} else
			logger.warn('QueryBuilder - No fields structure');

		QueryBuilderPagination.buildLimit(this.knexStatement, this.params);

		if(this.params.debug)
			logger.info('statement', this.knexStatement.toString());
	} */

	/**
	 * Initializes the Query Builder, creates the Knex Statement with table
	 *
	 */
	_init() {

		this.knexStatement = this.knex({ t: this.model.addDbName(this.table) });
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
	 * Search objets in the Database.
	 * @param {objects} parametres Object with Parametres and filters
	 * @return {Promise<Array>} Array of Objects in Database
	 */
	async get(parametres = {}) {

		this.params = parametres;

		this._init();

		QueryBuilderSelect.buildSelect(this.knexStatement, this.model, this.params);

		if(this._modelHasFieldsStructure()) {
			QueryBuilderJoins.buildJoins(this.knexStatement, this.model, this.params);
			QueryBuilderFilters.buildFilters(this.knexStatement, this.model, this.params);
			QueryBuilderOrder.buildOrder(this.knexStatement, this.model, this.params);
			QueryBuilderGroup.buildGroup(this.knexStatement, this.model, this.params);
		} else
			logger.warn('QueryBuilder - No fields structure');

		QueryBuilderPagination.buildLimit(this.knexStatement, this.params);

		if(this.params.debug)
			logger.info('statement', this.knexStatement.toString());

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

		const duplicateKey = ' ON DUPLICATE KEY UPDATE ';

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

		try {

			let query = this.knexStatement.insert(items).toString();

			query += await this._upsertFormatFields();

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

		this.params = {
			filters
		};

		this._init();

		values = await this._formatUpdateValues(values);
		try {
			QueryBuilderFilters.buildFilters(this.knexStatement, this.model, this.params);
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
	 * @param {object} joins Object with Joins.
	 * @returns {Promise<Array>} Array of Objects, index 0: Results-Headers object
	 */
	async remove(filters, joins) {

		this._initWithoutAlias();

		this.params = {
			filters,
			joins
		};

		try {

			// Builds the Filters (Where)
			QueryBuilderFilters.buildFilters(this.knexStatement, this.model, this.params);
			// Builds the Joins
			QueryBuilderJoins.buildJoins(this.knexStatement, this.model, this.params);
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
		const table = this.model.addDbName(this.table);
		let rows;

		try {
			[rows] = await this.knex.raw(`SHOW COLUMNS FROM ${table};`);
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

}

module.exports = QueryBuilder;
