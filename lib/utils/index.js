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
	},
	/**
	*	Convert a string to camelCase
	*	@param {string} The string to convert
	* @return {string} The modfied string
	*/
	convertToCamelCase(str) {
		return str.replace(/_([a-z])/g, letter => letter[1].toUpperCase());
	},
	/**
	*	Convert a string to snake_case
	*	@param {string} The string to convert
	* @return {string} The modfied string
	*/
	convertToSnakeCase(str) {
		return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
	}
};

module.exports = Utils;
