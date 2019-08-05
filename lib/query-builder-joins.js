'use strict';

const QueryBuilderError = require('./query-builder-error');
const QueryBuilderFields = require('./query-builder-fields');

const JOIN_DEFAULT_METHOD = 'left';
const JOIN_DEFAULT_OPERATOR = '=';

class QueryBuilderJoins {

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

	/**
	 * Initialize the necesary data to use the Builder
	 * @param {instance} model Model to be used
	 */
	static initModel(model) {

		this.modelName = model.constructor.name;
		this.joins = model.constructor.joins;
		this.modelName = model.constructor.name;
		this.model = model;
	}

	/**
	 * Build Joins.
	 * @param {object} knex must have key 'knexStatement' with knex function
	 * @param {instance} model
	 * @param {object} parameters
	 */
	static buildJoins(knex, model, parameters) {

		if(!knex)
			throw new QueryBuilderError('Invalid Knex', QueryBuilderError.codes.INVALID_KNEX);

		if(!model)
			throw new QueryBuilderError('Invalid Model', QueryBuilderError.codes.INVALID_MODEL);

		this.initModel(model);

		// To Build the Orders needs to validate Fields
		// Need to Init Builder Fields if it's not
		QueryBuilderFields.initModel(model);

		const { joins } = parameters;

		if(!joins)
			return;

		if(!Array.isArray(joins))
			throw new QueryBuilderError('Param \'joins\' must be an array', QueryBuilderError.codes.INVALID_JOINS);

		joins.forEach(joinKey => this._makeJoin(joinKey, knex));
	}

	/**
	 * Add a single join.
	 *
	 * @param {string} joinKey The join key
	 */
	static _makeJoin(joinKey, knex) {

		if(!this._validateJoin(joinKey))
			throw this.error;

		const joinTable = this._getJoinTable(joinKey);
		const joinMethod = this._getJoinMethod(joinKey);

		knex[joinMethod](joinTable, builder => {

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
	static _validateJoin(joinKey) {

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
	static _joinExists(joinKey) {
		return typeof this.joins[joinKey] !== 'undefined';
	}

	/**
	 * Indicates if join method exists
	 *
	 * @param {string} joinMethod The join method
	 * @return {Boolean} true if exists, false otherwise
	 */
	static _joinMethodExists(joinMethod) {
		return typeof this.joinMethods[joinMethod] !== 'undefined';
	}

	/**
	 * Indicates if operator is valid
	 *
	 * @param {string} operator The join operator
	 * @return {boolear} true if valid operator, false otherwise
	 */
	static _validateJoinOperator(operator) {

		if(!this.joinOperators.includes(operator)) {
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
	static _validateJoinOn(joinKey, type = 'on') {

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
	static _validateJoinFields(joinKey, joinFields) {

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

		const isValidFields = QueryBuilderFields._validateField(fieldA)
			&& !QueryBuilderFields._isFlagField(fieldA)
			&& this._validateJoinOperator(operator)
			&& QueryBuilderFields._validateField(fieldB)
			&& !QueryBuilderFields._isFlagField(fieldB);

		if(!isValidFields)
			this.error = new QueryBuilderError(`Unknown fields, check ${this.modelName}.fields`, QueryBuilderError.codes.INVALID_FIELDS);

		return isValidFields;
	}

	/**
	 * Gets the join method.
	 *
	 * @param {string} joinKey The join key
	 * @return {string} The join method.
	 */
	static _getJoinMethod(joinKey) {
		const joinMethod = this.joins[joinKey].method || JOIN_DEFAULT_METHOD;
		return this.joinMethods[joinMethod];
	}

	/**
	 * Gets the join table.
	 *
	 * @param {string} joinKey The join key
	 * @return {string} The join table.
	 */
	static _getJoinTable(joinKey) {
		const modelJoin = this.joins[joinKey];
		const table = modelJoin.table || joinKey;
		return `${table} as ${modelJoin.alias}`;
	}

	/**
	 * Gets the formatted join fields.
	 *
	 * @param {array} joinFields The join fields
	 * @return {array} The formatted join fields.
	 */
	static _getFormattedJoinFields(joinFields) {
		return joinFields.map(joinField => {
			return QueryBuilderFields._fieldExists(joinField) ? QueryBuilderFields._getFormattedField(joinField) : joinField;
		});
	}

}

module.exports = QueryBuilderJoins;
