(function () {
    'use strict';
    const mqtt = require('mqtt') //require('mqtt/lib/connect/index');
    const os = require("os")
    const ip = require("ip")

    /**
   * Factory function for the MQTTBridge service
   */
    console.log("registering mqtt service")
    var MQTTService = function ($rootScope, $interval) {
        const root_topic = "smart-mirror"
        const hostname= os.hostname()
        const id = root_topic+"-"+hostname
        const ha_prefix='homeassistant/'
        let client = null;
        let client_connected = false;
        let client_reconnecting = false;
        const subscribed = []

        let pending_connect = []
        let running=false
        var service = {};
        var reconnect_handle = null;
        //let connect_handle = null
        service.running = false;
        service.paused = true;

        console.log("in mqtt service")
        const do_connect = ()=>{
            console.log("[MQTT] connecting");
            if(client){
                client.connect()
            }
        }
        service.start = function (topics) {
            if (client == null) {
                const options = {}
                process.env.DEBUG = "fribble*" // "mqttjs:ws"
                //options["rejectUnauthorized"] = self.config.mqttConfig.rejectUnauthorized;
                if (config.mqtt !== undefined && config.mqtt.server_address !== undefined && config.mqtt.server_port !== undefined) {
                    if (config.mqtt.username != "" && config.mqtt.userpassword != "") {
                        options.username = config.mqtt.username
                        options.password = Buffer.from(config.mqtt.userpassword)
                        options.port = config.mqtt.server_port
                        options.manualConnect = true
                        options.reconnectPeriod = 5000;
                        // because we are in browser, we need to use web sockets explicitly
                        // as "mqtt://" will not fall back down to web sockets on its own
                        // also the broker needs to be listening for web socket connections
                        // separately from mqtt connections..   then also on a different port..
                        client = mqtt.connect("ws://" + config.mqtt.server_address , options)
                        do_connect()
                    }
                }
            }
            if (client) {
                client.on('connect', function () {
                    console.log("[MQTT] connected")
                    client_connected = true;
                    if(reconnect_handle){
                        clearInterval(reconnect_handle)
                        reconnect_handle=null
                    }
                    if(client_reconnecting){
                        service.resend_states()
                        client_reconnecting=false;
                    }
                    else {
                        pending_connect.forEach(d => {
                            service.subscribe(d.topic, d.callback, d.options, true)
                        })
                        pending_connect = []
                    }
                })

                client.on('disconnect',()=>{
                    console.log("[MQTT] clinet disconnected")
                })

                client.on('error', function (error) { //MQTT library function. Returns ERROR when connection to the broker could not be established.
                    console.log("[MQTT] MQTT broker error: " , error);
                });

                client.on('offline', function () { //MQTT library function. Returns OFFLINE when the client (our code) is not connected.
                    console.log("[MQTT] Could not establish connection to MQTT broker");
                    if(client_connected === true){
                        client_connected = false;
                        client_reconnecting = true
                        //client.reconnecting = true
                        reconnect_handle=setInterval(()=>{console.log("mqtt attempting reconnect");do_connect()}, 5000)
                    }
                });

                client.on('message', function (topic, message) {  //MQTT library function. Returns message topic/payload when it arrives to subscribed topics.
                    console.log('[MQTT] MQTT message received. Topic: ' + topic + ', message: ' + message);
                    const entry = subscribed.filter(x => {
                        let id1 = topic.slice(id.length+1)
                        //console.log("mqtt id1  = "+ id1.length + " topic length ="+x.topic.length)
                        if (id1.startsWith(x.topic))
                            return true
                    })
                    if (entry.length) {
                        console.log("found subscribed topic=" + topic)
                        if (topic.endsWith('state'))
                            message='state'
                        if (typeof entry[0].callback === 'string')
                            $rootScope.broadcast(entry[0].callback, message.toString())
                        else
                            entry[0].callback(message.toString())
                    }
                });
                client.on('reconnect', ()=>{
                    console.log("mqtt client reconnect started")
                })
            }
        }
        

        service.stop = function () {

        }

        service.subscribe = function (topic, callback , options = {} , retry=false) {
            if (client_connected) {
                let previous = subscribed.filter(entry => {
                    if (entry.topic === topic)
                        return true
                })
                if (previous.length) {
                    throw ("topic already registered")
                }
                // if the requestor didn't specifiy the clean option (auto resubscribe at broker)
                if(options['clean'] === undefined )
                    // request it
                    options.clean = true
                if (typeof callback === 'string' || typeof callback === 'function') {
                    subscribed.push({ "topic": topic, "callback": callback, "options": options })
                    console.log("[MQTT] subscribing to "+id+'/'+topic)
                    client.subscribe(id+'/' + topic+'/#', options)
                    if (!running) {
                        running = true
                        console.log("mqtt starting timer for ha discovery packet")
                        setTimeout(() => {
                            console.log("mqtt sending home assistant discover")
                            service.HomeAssistantDiscover();
                        }, 10000)
                    }
                }
                else
                    throw ("subscribe callback not correct type, string or function allowed")
            } else {
                if(!retry)
                    pending_connect.push({'topic':topic,'options':options,'callback':callback})
            }        
        }

        service.publish = function (topic, data) {
            if (client_connected == true) {
                const switch_type=(typeof data =='object'?'something':'switch')
                if (topic.endsWith('/state')) {
                    if (switch_type === 'switch') {
                        data = { state: data }
                    }
                    console.log("sending state for " + topic + " mqtt topic=" + ha_prefix + id + '/' + topic)
                    client.publish(ha_prefix+switch_type+'/'+id+'/' + topic, JSON.stringify(data), {retain:true})
                }
                else
                    client.publish(root_topic+'/' + topic, JSON.stringify(data), {retain:true})
            }
        }
        service.resend_states = function (){
            subscribed.forEach(t => {
                setTimeout((t)=>{
                        t.device_state=t.callback('state')
                        console.log("mqtt resending state="+t.device_state+" for "+t.topic)
                        service.publish(t.topic+"/state",t.device_state)
                    },
                    1000, t
                )
            })
        }

        service.HomeAssistantDiscover = function () {

            console.log("HA discovery build for " + subscribed.length + " entities")
            const discoverTopic = ha_prefix+'switch/' + id + '/config'
            subscribed.forEach(t => {
                t.device_state=t.callback('state')
                console.log("mqtt state received="+t.device_state)
                let thing = t.topic.split('/').slice(-1)
                let discoverPacket = {
                    "device": {
                        "identifiers": id,
                        "manufacturer": "sam detweiler",
                        "name": "Smart Mirror on "+hostname,
                        "configuration_url": "http://"+ip.address()+":"+config.remote.port+"/config.html",
                        "sw_version": "0.32"
 //                       "area":"Hall"
                    },                    
                    //"availability_topic": ha_prefix+"switch/"+id+'/'+thing+"/available",
                    //"payload_available": "Online",
                    //"payload_not_available": "Offline",
                    "object_id": id+  '/' +thing,
                    "unique_id": id + '/' + thing,
                    "name": "screen",
                    "command_topic": id + '/' + t.topic, // root_topic+t.topic,
                    "payload_on": "on",
                    "payload_off": "off",
                    "state_topic":ha_prefix+"switch/"+id+'/'+thing+"/state",
                    "state_on": true,
                    "state_off": false, 
                    "value_template": "{{ value_json.state }}",
                    "qos": 1
                }
                console.log("mqtt sending discover = "+discoverTopic+ " data="+JSON.stringify(discoverPacket,null,2))
                let rc = client.publish(discoverTopic, JSON.stringify(discoverPacket))                
                //console.log("mqtt discovery publish rc=" + JSON.stringify(rc, null, 2))
                //client.publish(discoverPacket.state_topic, discoverPacket.state_on.toString())
                // setTimeout((t)=>{service.publish(t.topic+"/available",discoverPacket.payload_available)}, 1000, t)
                setTimeout((t)=>{service.publish(t.topic+"/state",t.device_state)}, 1000, t)
            })
        }
        
        return service
    }
    angular.module('SmartMirror')
        .factory('MQTTService', MQTTService)
}());
