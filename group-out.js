module.exports = function(RED) {
    function WhatsappGroupOut(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.gID = config.gID;
        node.gID = node.gID.replace(/\D/g, '');
        node.gID = `${node.gID}@g.us`;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;

        node.on('input', (message)=> {
            try {
                node.waClient.sendMessage(node.gID, message.payload);
            }
            catch(e) {
                node.log(`Error Sending Msg: ${e}`);
            };
        });
        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
        };

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
    RED.nodes.registerType("group-out", WhatsappGroupOut);
}
