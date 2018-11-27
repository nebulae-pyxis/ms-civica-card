
import { ApduCommandReq } from "../../messages/request/apdu-command-req";

export class AuthCardSecondStep  extends ApduCommandReq {

  constructor(data) {
    super(data);
  }

}
