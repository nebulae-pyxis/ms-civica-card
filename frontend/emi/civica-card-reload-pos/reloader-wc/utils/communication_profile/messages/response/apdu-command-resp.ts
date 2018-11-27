import { DataBlockResponse } from '../../data-block-resp';

export class ApduCommandResp extends DataBlockResponse {
  constructor(responseList) {
    super(responseList, false);
  }
}
