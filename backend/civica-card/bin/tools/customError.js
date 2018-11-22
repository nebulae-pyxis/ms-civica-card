//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = 1;


const BUSINESS_NOT_FOUND = 18010;
const BUSINESS_NOT_ACTIVE = 18011;
const BUSINESS_WALLET_NOT_FOUND = 18012;
const BUSINESS_WALLET_SPENDING_FORBIDDEN = 18013;
const CONVERSATION_NOT_FOUND = 18014;

const CIVICA_CARD_CORRUPTED_DATA = 18020;
const CIVICA_CARD_READ_FAILED = 18021;
const CIVICA_CARD_WRITE_FAILED = 18022;
const CIVICA_CARD_DATA_EXTRACTION_FAILED = 18022;


const BYTECODE_COMPILER_ERROR = 18030;
const HW_CARD_TYPE_INVALID = 18031;
const HW_CARD_ROLE_INVALID = 18032;
const HW_CARD_DATA_TYPE_INVALID = 18033;
const HW_READER_TYPE_INVALID = 18034;

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
  constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE, message = '') {
    super(message);
    this.code = code;
    this.name = name;
    this.method = method;
  }

  getContent() {
    return {
      name: this.name,
      code: this.code,
      msg: this.message,
      method: this.method,
      // stack: this.stack
    }
  }
};

class DefaultError extends Error {
  constructor(anyError) {
    super(anyError.message)
    this.code = INTERNAL_SERVER_ERROR_CODE;
    this.name = anyError.name;
    this.msg = anyError.message;
    // this.stack = anyError.stack;
  }

  getContent() {
    return {
      code: this.code,
      name: this.name,
      msg: this.msg
    }
  }
}


module.exports = {
  CustomError,
  DefaultError,
  BUSINESS_NOT_FOUND,
  BUSINESS_NOT_ACTIVE,
  BUSINESS_WALLET_NOT_FOUND,
  BUSINESS_WALLET_SPENDING_FORBIDDEN,
  CONVERSATION_NOT_FOUND,
  CIVICA_CARD_CORRUPTED_DATA,
  CIVICA_CARD_READ_FAILED,
  CIVICA_CARD_WRITE_FAILED,
  CIVICA_CARD_DATA_EXTRACTION_FAILED,
  BYTECODE_COMPILER_ERROR,
  HW_CARD_TYPE_INVALID,
  HW_CARD_ROLE_INVALID,
  HW_CARD_DATA_TYPE_INVALID,
  HW_READER_TYPE_INVALID,
} 