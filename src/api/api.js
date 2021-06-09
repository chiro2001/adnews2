import { setConfig, setErrorInfo } from "../data/action";
import store from "../data/store";


class API {
  constructor() {
    // this.host = '127.0.0.1';
    this.host = window.location.href.includes("localhost") ? "localhost" : null;
    // this.port = 8080;
    this.port = 8880;
    this.api_version = "v2";
    this.api_prefix = `/api/${this.api_version}`;
    this.protocol = 'http'
    this.url = this.host ? `${this.protocol}://${this.host}:${this.port}${this.api_prefix}` : `${this.api_prefix}`;
    this.cookie = '';
    this.cookies = [this.cookie,];
  }
  async request() {
    
  }
}

const api = new API();

export { API, api };