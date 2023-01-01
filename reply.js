module.exports = function(RED) {
    function WhatsappReply(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.instruction = config.instruction ;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        let instructionPayload = null ;

        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});   
        };

        node.on('input', (msg)=>{
            instructionPayload = msg.payload ;
        });
               
        node.waClient.on('message_create', async (message) => {
            if (message.body.startsWith(node.instruction)){
                if(instructionPayload) {
                    message.reply(instructionPayload)
                } 
                else {
                    message.react('😅');
                    message.reply('👍');
                };
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
    RED.nodes.registerType("reply", WhatsappReply);
}
