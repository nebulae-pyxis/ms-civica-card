import { ApduCommandReq } from "../../messages/request/apdu-command-req";

export class ApduReadWriteCardData  extends ApduCommandReq {

  constructor(data) {
    super(data);
  }


}
