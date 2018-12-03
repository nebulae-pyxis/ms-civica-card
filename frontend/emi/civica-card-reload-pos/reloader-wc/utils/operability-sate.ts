export enum OperabilityState {
  BLUETOOTH_NOT_AVAILABLE = 'BLUETOOTH_NOT_AVAILABLE',
  UNKNOWN_POSITION  = 'UNKNOWN_POSITION',
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  WITHOUT_LOCATION = 'WITHOUT_LOCATION',
  IDLE = 'IDLE',
  READING_CARD = 'READING_CARD',
  REQUESTING_RELOAD_PERMISSION = 'REQUESTING_RELOAD_PERMISSION',
  READING_CARD_ERROR = 'READING_CARD_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CARD_READED = 'CARD_READED',
  RELOADING_CARD = 'RELOADING_CARD',
  RELOADING_CARD_ERROR = 'RELOADING_CARD_ERROR',
  RELOAD_CARD_ABORTED = 'RELOAD_CARD_ABORTED',
  RELOAD_CARD_SUCCESS = 'RELOAD_CARD_SUCCESS',
  RELOAD_CARD_REFUSED = 'RELOAD_CARD_REFUSED',
}
