"use strict";

const civicaCardCQRS = require("./CivicaCardCQRS")();
const civicaCardES = require("./CivicaCardES")();

module.exports = {
  /**
   * @returns {CivicaCardCQRS}
   */
  civicaCardCQRS,
  /**
   * @returns {CivicaCardES}
   */
  civicaCardES
};
