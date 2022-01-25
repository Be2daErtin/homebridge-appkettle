# Homebridge AppKettle

A [homebridge](https://github.com/nfarina/homebridge) plugin that exposes your AppKettle to HomeKit.

## Overview

This plugin exposes the AppKettle as a switch device, with the switch power state representing the Kettle boile state. 

## Setup

You install Plugins using the [Homebridge UI](https://github.com/oznu/homebridge-config-ui-x), or the same way you installed Homebridge - as a global NPM module. For example:

```shell
sudo npm install -g homebridge-appkettle
```

## Configration

Configuration via [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x). is not yet supported.

## Sample Configuration

```yaml
"accessories": [
    {
      "accessory": "AppKettle",
      "name": "Coffee Maker",
	  "temp": 95,
	  "keepwarmsec" : 10,
	  "keepwarm": true,
	  "ip": "192.168.0.123",
	  "port": 6002
    }
  ]
```
### Configuration Definition

* **accessory**: The identifier for the accessory (*AppKettle*).
* **name**: The name you would like to expose for the device.
* **temp**: Target temperature when turning on the kettle.
* **keepwarmsec**: Time to keep kettle warm after target temperature has been reached.
* **keepwarm**: True - If keep warm unction should be enforced.
* **ip**: The plugin requires the IP of the Appkettle
* **port**: The plugin requires the Port of the Appkettle (Usully 6002)

## Retrieving the IP for the Kettle

The plugin does not currently support self dicovery fir IP and port just yet.
You'll need to check for the connected devices on your router.