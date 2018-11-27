import { DataBlockResponse } from "../../data-block-resp";


export class ApduReadWriteCardDataResp extends DataBlockResponse {
  constructor(responseList) {
    super(responseList, false);
  }
}
