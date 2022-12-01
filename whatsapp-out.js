module.exports = function(RED) {
    function WhatsappOut(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.number = config.number;
        this.number = this.number.includes('@c.us') ? this.number : `${this.number}@c.us`;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        var whatsappConnectionStauts = null;

        async function whatsappConnection(){
            whatsappConnectionStauts = await node.waClient.getState();
        };
               
        setInterval(function(){
            whatsappConnection();
            if (whatsappConnectionStauts==="CONNECTED"){
                node.status({fill:"green",shape:"dot",text:"Connected"})
            } else {
                node.status({fill:"red",shape:"dot",text:"Not Connected"})
            }
        },5000)

        node.on('input', (message)=> {
            node.waClient.sendMessage(this.number, message.payload);
        });

    }
    RED.nodes.registerType("whatsapp-out", WhatsappOut);
}
