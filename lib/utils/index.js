'use strict';

/**
* Util module
*/
const Utils = {

	/**
	 * Make unique an array
	 *
	 * @param {array} items The items
	 * @return {array} The items without repetitions
	 */
	arrayUnique(items = []) {
		return items.filter((item, index) => items.indexOf(item) === index);
	}
};

module.exports = Utils;
