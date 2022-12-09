module.exports = function(RED) {
    function WhatsappOut(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.number = config.number;
        node.number = node.number.match(/\d+/);
        //node.number = this.number.includes('@c.us') ? this.number : `${this.number}@c.us`;
        node.number = `${node.number}@c.us`;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;

        node.on('input', (message)=> {
            node.waClient.sendMessage(this.number, message.payload);
        });


        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
        };

        //whatsapp Status Parameters----
        node.waClient.on('qr', (qr) => {
            SetStatus("QR Code Generated", "yellow");
            QRCode.toDataURL(qr, function(err, url){
                msg = {payload : url};
                node.send(msg);
            });
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
    RED.nodes.registerType("whatsapp-out", WhatsappOut);
}
