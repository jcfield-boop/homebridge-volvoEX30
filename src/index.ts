import { API } from 'homebridge';
import { VolvoEX30Platform } from './platform';

export = (api: API) => {
  api.registerPlatform('homebridge-volvo-ex30', 'VolvoEX30', VolvoEX30Platform);
};