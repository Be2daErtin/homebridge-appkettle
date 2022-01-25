const net = require("net"); // import net
const { EventEmitter } = require('events');
const PLAIN_HEADER = "##00"

class AppKettleClient extends EventEmitter {
	
  constructor(ip,port){
	  super ();
	  this.ip = ip;
	  this.port = port;
	  this.myKettle = {"power":"Off", "state": "unknown","seq":0,"cmd":"unknown","imei":"none"};
  }
  
  connect(){
	  this.client = net.connect({host:this.ip,port:this.port}, () => {
		this.emit('connected');
	  });
	  
	  this.client.on("data", data => {
		this.unpack_main_msg(data);
	});
  }
  
  seq_tick(){
	  var seq = this.myKettle.seq;
	  //console.log("Seq Before: ",this.myKettle.seq);
	  this.myKettle.seq = (this.myKettle.seq + 1) % 0xFF;
	  //console.log("Seq After: ",this.myKettle.seq);
  }
  
  turn_off(){
	console.log("----------------------------");
	console.log("Turn AppKettle OFF Request...");
	this.seq_tick();
	var seq = this.myKettle.seq.toString(16).padStart(2, '0');
	var msg = `AA000D00000000000003B7${seq}3A0000`;
	msg = this.calc_msg_checksum(msg, true)
	
	this.send_msg(msg);
  }
  
  turn_on(target_temp,keep_warm_secs, keep_warm_onoff){
	console.log("----------------------------");
	console.log("Turn AppKettle ON Request...");
	console.log("Target Temp: ",target_temp);
	console.log("KeepWarm: ",keep_warm_secs);
	console.log(this.myKettle);
	
	if (this.myKettle.state != "Ready"){
		console.log("Not ready!");
		this.wake();
	}
	console.log("----------------------------");
	console.log("TurnOn AppKettle...");
	this.seq_tick();
	const seq_hex = this.myKettle.seq.toString(16).padStart(2, '0'); 
	
	var target_temp = target_temp //Degrees C
	var kw = keep_warm_secs //seconds
	if (!keep_warm_onoff) {
		kw = 0;
		console.log("Do Not Keep Warm");
	}

	const temp_hex = target_temp.toString(16).padStart(2, '0');
	const kw_hex = kw.toString(16).padStart(2, '0');;
	console.log("Temp:",target_temp, "temp_hex:", temp_hex)
	console.log("KW:",kw, "kw_hex:", kw_hex)

	var msg = `AA001200000000000003B7${seq_hex}39000000${temp_hex}${kw_hex}0000`
	msg = this.calc_msg_checksum(msg, true)
	
	this.send_msg(msg);	
  }
  
  wake(){
	console.log("----------------------------");
	console.log("Wake AppKettle ...");
	this.seq_tick();
	var seq = this.myKettle.seq.toString(16).padStart(2, '0');
	var msg = `AA000D00000000000003B7${seq}410000`;
	msg = this.calc_msg_checksum(msg, true)
	
	this.send_msg(msg);
		
  }
  
  send_msg(data2){
	  var imei = this.myKettle.imei;
	  var msg = `{"app_cmd":"62","imei":"${imei}","SubDev":"","data2":"${data2}"}`;
	  const lengt_content = msg.length.toString(16)
	  msg = PLAIN_HEADER + lengt_content + msg + "&&"
	  console.log("Sending to Kettle: ",msg);
	  this.client.write(msg);
  }
  
  calc_msg_checksum(msg, append) {
	var msg_hexbytes = Buffer.from(msg,'hex');
	var checksum = 0;
	for (var i = 1; i < msg_hexbytes.length - 1; i++) {
		checksum += msg_hexbytes[i]
	}
	checksum = 0xFF - (checksum % 256)
	if (append) {return msg = msg + checksum.toString(16)}
	else {return checksum}	
	
}//calc_msg_checksum

  unpack_main_msg(data) {
	let msg = String(data);
	var data_json;
	console.log("Unpacking main message...");
	msg = msg.substring(6,msg.length-2);
	//console.log(msg);
	
	if (msg.indexOf("wifi_cmd") !== -1) {
		console.log("Unpacking message...WifiCommand");
		const data = String(msg);
		try  {
			data_json = JSON.parse(data);
		}catch(err) {
			console.log("Not understanding message: ",data);
			return
		}
		this.myKettle.imei = data_json["imei"];
		this.cmd_unpack(data_json["data3"]);
		//return cmd_unpack(msg["data3"], print_msg, print_stat_msg, "K")
	}
	else {
		console.log("Unpacking message...Something else");
	}
};//unpack_main_msg


cmd_unpack(msg) {
	var msg_hexbytes = Buffer.from(msg,'hex');
	var msg_hexbytes_header = msg_hexbytes.slice(0,15);
	
	var header_dict = {"head": "h", "length": "h","b03":"B","b090A":"h","seq":"B","cmd":"c"};
	var status_dict = {"msg_status":"x","status": "B", "keep_warm_secs": "h","temperature":"B","target_temp":"B","volume":"h"};
	
	header_dict.head = msg_hexbytes_header.toString('hex')[0x00];
	header_dict.length = msg_hexbytes_header[0x01] + msg_hexbytes_header[0x02];
	header_dict.b03 = msg_hexbytes_header[0x03];
	header_dict.b090A = msg_hexbytes_header[0x09] + msg_hexbytes_header[0x0A];
	header_dict.seq = msg_hexbytes_header[0x0B];
	header_dict.cmd = msg_hexbytes_header[0x0C];
	
	if (msg_hexbytes.length != header_dict.length + 3) {
		console.log("Length does not match the received packet, ignoring msg:", msg)
		return
	}
	
	const msg_checksum = this.calc_msg_checksum(msg, false)
	const cmd_checksum = msg_hexbytes[msg_hexbytes.length - 1]
	
	if (msg_checksum != cmd_checksum) {
		console.log("Bad checksum, ignoring msg:", msg);
		return
	}
	
	this.cmd_name = "Unknown"
	
	if (header_dict.length >= 14) {
		var cmd_ack = {"ack": msg_hexbytes[0x0F]}
	}
		
	if (header_dict.length >= 16) {
		var msg_stat_hex_bytes_frame = msg_hexbytes.slice(16,-1);
		if (header_dict.cmd == 54){
			status_dict.msg_status =  msg_stat_hex_bytes_frame[0x00];
			status_dict.status =  msg_stat_hex_bytes_frame[0x01];
			status_dict.keep_warm_secs =  msg_stat_hex_bytes_frame[0x02] + msg_stat_hex_bytes_frame[0x03];
			status_dict.temperature =  msg_stat_hex_bytes_frame[0x04];
			status_dict.target_temp =  msg_stat_hex_bytes_frame[0x05];
			status_dict.volume  = msg_stat_hex_bytes_frame.readIntBE(6,2);
		}
		else if (header_dict.cmd == 57) {
			var msg_stat_hex_bytes_frame = msg_stat_hex.slice(16,-1);
			console.log(msg_stat_hex_bytes_frame) 
			status_dict.target_temp =  msg_stat_hex_bytes_frame[0x00];
			status_dict.keep_warm_secs =  msg_stat_hex_bytes_frame[0x01];
		}
	}
	
	//Map the dictonary with known values
	switch(header_dict.cmd) {
		case 54:
			header_dict.cmd = "STAT"
		break;
		case 57:
			header_dict.cmd = "KETTLE_ON"
		break;
		case 58:
			header_dict.cmd = "KETTLE_OFF"
		break;
		case 65:
			header_dict.cmd = "KETTLE_WAKE"
		break;
		default:
			header_dict.cmd = "Unknown", header_dict.cmd
		// code block
	} 
	
	var kettleState = "Unknown";
	
	switch(status_dict.status) {
		//0x11    : status : 0="Not on base", 2="Standby", 3="Ready", 4="Heating", 5="Keep Warm"
		case 0:
			header_dict.cmd = "NotOnBase"
			this.myKettle.power = "Off";
			break;
		case 2:
			header_dict.cmd = "Standby"
			this.myKettle.power = "Off";
			break;
		case 3:
			header_dict.cmd = "Ready"
			this.myKettle.power = "Off";
			break;
		case 4:
			header_dict.cmd = "Heating"
			this.myKettle.power = "On";
			break;
		case 5:
			header_dict.cmd = "KeepWarm"
			this.myKettle.power = "On";
			break;
		default:
			console.log("UNKNOWN STATE",status_dict.status)
			header_dict.cmd = "Unknown"
	} 
	//console.log(header_dict);
	//console.log(status_dict);
	
	console.log("----------------");
	this.kettle_dict = Object.assign({}, header_dict, status_dict);
	//console.log(this.kettle_dict);
	
	this.myKettle.state = header_dict.cmd;
	this.myKettle.seq = header_dict.seq;
	this.myKettle.seq = header_dict.seq;
	//console.log(this.myKettle)

	this.emit('kettleState',this.myKettle);

};
}

module.exports = AppKettleClient