const AppKettleClient = require('./lib/AppKettleClient.js');

module.exports = (api) => {
  api.registerAccessory('AppKettle', AppKettle);
}

var MyKettle = {"cmd": "unknown",
				"status": "unknown",
				"keep_warm_sec": 10,
				"keep_warm": false,
				"current_temp": 100,
				"target_temp": 100,
				"set_temp": 100,
				"volume": 0,
				"power":"ON",
				"seq": 0
				}

class AppKettle {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
	
	//Get Kettle config from logs
	this.kettleIP = config.ip;
	this.kettlePort = config.port;
	//this.kettleIMEI = confog.imei;
	
	MyKettle.target_temp = config.temp
	MyKettle.keep_warm = config.keepwarm
	MyKettle.keepwarm_seconds = config.keepwarmsec
	
	if ((this.kettlePort == null) || (this.kettlePort == null)){
		 this.log.error("AppKettle will not be initialized due to a configuration error. Check IP and Port in the config");
		 return
	}

    this.log.debug('AppKettle Accessory Plugin Loaded');

    // your accessory must have an AccessoryInformation service
    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(this.api.hap.Characteristic.Model, "Custom Model");

    // create a new "Switch" service
    this.switchService = new this.api.hap.Service.Switch(this.name);

    // link methods used when getting or setting the state of the service 
    this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
      .onGet(this.getOnHandler.bind(this))   // bind to getOnHandler method below
      .onSet(this.setOnHandler.bind(this));  // bind to setOnHandler method below
	 
	const apk = this.apk = new AppKettleClient(this.kettleIP,this.kettlePort);
	
	apk.on('connected', this._apkConnected.bind(this))
	apk.on('kettleState', this._updateKettleState.bind(this))
	
	this.apk.connect();
  }
  
_apkConnected () {
	this.log('AppKettle Connected!')
}//_apkConnected
 
_updateKettleState (newkettlestate){
	this.log(newkettlestate);
	this.MyKettleState = newkettlestate;
	this.log('AppKettle state changed outside HomeKit: ', this.MyKettleState.power)
	const kettleState = (this.MyKettleState.power == "On") ? true : false;
	this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
		.updateValue(kettleState);
}
  
  getServices() {
	  //Return an array of the services to expose.
    return [
      this.informationService,
      this.switchService,
    ];
  }

  async getOnHandler() {
    this.log.info('Getting AppKettle state: ',MyKettleState.power);
	const kettleState = (MyKettleState.power == "On") ? true :false;
  
    return false;
  }
  
  async setOnHandler(value) {
    this.log.info('Setting switch state to:', value);
	if (value) {
		//Turn on the Kettle
		this.apk.turn_on(MyKettleState.target_temp,MyKettleState.keepwarm_seconds, MyKettleState.keepwarm);
	}else {
		//Turn off the kettle
		this.apk.turn_off();
	}
	
  }
}