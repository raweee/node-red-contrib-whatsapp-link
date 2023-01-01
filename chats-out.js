module.exports = function(RED) {
    function WhatsappOut(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.number = config.number;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;

        let SetStatus = function(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
        };

        node.on('input', (message)=> {
            let number = node.number;
            if (message.number != null){
                number = message.number;
            }
            if (number){
                number = number.replace(/\D/g, '');
                number = `${number}@c.us`;
                try {
                    node.waClient.sendMessage(number, message.payload);
                    SetStatus("Message Send.", "green");
                    setTimeout(()=>{
                        SetStatus('Connected','green');
                    }, 3000)
                }
                catch(e) {
                    node.log(`Error Sending Msg: ${e}`);
                };
            } 
            else {
                SetStatus("No number","red");
                setTimeout(()=>{
                    SetStatus('Connected','green');
                }, 5000)
            }


        });

        //whatsapp Status Parameters----
        node.waClient.on('qr', (qr) => {
            SetStatus("QR Code Generated", "yellow");
        });
        
        node.waClient.on('auth_failure', () => {
            SetStatus('Not Connected','red');
        });
                
        node.waClient.on('loading_screen', () => {
            SetStatus('Connecting...','yellow');
        });
        
        node.waClient.on('ready', () => {
            SetStatus('Connected','green');
        });

        node.waClient.on('disconnected', () => {
            SetStatus("Disconnected","red");
        });

    }
    RED.nodes.registerType("chats-out", WhatsappOut);
}
