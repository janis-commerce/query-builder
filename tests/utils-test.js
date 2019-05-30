'use strict';

const assert = require('assert');

const Utils = require('./../utils');

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
});
