module.exports = function(RED) {


    function WhatsappIn(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;


        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});   
        };
               
        node.waClient.on('message', async message => {
            let msg = {};
            msg.payload = message.body;
            msg.from = message.author || message.from ;
            msg.chatID = message.from.replace(/\D/g, '');
            msg.from = msg.from.replace(/\D/g, '');
            msg.message = message ;
            node.send(msg);
        });

        //whatsapp Status Parameters----
        node.waClient.on('qr', (qr) => {
            SetStatus("QR Code Generated", "yellow");
            // QRCode.toDataURL(qr, function(err, url){
            //     msg = {payload : url};
            //     node.send(msg);
            // });
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
    RED.nodes.registerType("whatsapp-in", WhatsappIn);
}
