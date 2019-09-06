'use strict';

const assert = require('assert');

const Utils = require('./../lib/utils');

/** Setup **/

/* eslint-disable prefer-arrow-callback */

describe('Utils', function() {

	describe('arrayUnique', function() {

		it('Should be a unique array', function() {
			assert.deepEqual(Utils.arrayUnique([1, 2]), [1, 2]);
			assert.deepEqual(Utils.arrayUnique([1, 2, 2]), [1, 2]);
			assert.deepEqual(Utils.arrayUnique(), []);
			assert.deepEqual(Utils.arrayUnique([]), []);
		});
	});

	describe('Should convert string to snake_case', function() {
		assert.equal(Utils.convertToSnakeCase('orderFormId'), 'order_form_id');
		assert.equal(Utils.convertToSnakeCase('checkBoolean'), 'check_boolean');
		assert.equal(Utils.convertToSnakeCase('status'), 'status');
	});

	describe('Should convert string to camelCamse', function() {
		assert.equal(Utils.convertToCamelCase('order_formId'), 'orderFormId');
		assert.equal(Utils.convertToCamelCase('check_boolean'), 'checkBoolean');
		assert.equal(Utils.convertToCamelCase('status'), 'status');
	});
});
