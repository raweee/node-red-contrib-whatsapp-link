module.exports = function(RED) {


    function WhatsappIn(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        var whatsappConnectionStauts = null;

        async function whatsappConnection(){
            whatsappConnectionStauts = await node.waClient.getState();
        };

        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
            msg = {payload : WAStatus};
            node.send(msg);    
        };
               
        setInterval(function(){
            whatsappConnection();
            if (whatsappConnectionStauts==="CONNECTED"){
                node.status({fill:"green",shape:"dot",text:"Connected"});
            } else {
                node.status({fill:"red",shape:"dot",text:"Not Connected"});
            }
        },5000)

       
        node.waClient.on('message', async msg => {
            msg.payload = msg.body;
            node.send(msg);

            // Whatsapp Chats testing text.
            if(msg.body === '!ping') {
                var fromContact = msg.from.match(/\d+/);
                msg.reply('pong from Node-Red');
                msg.payload = `!ping recieved from ${fromContact}.`
                node.send(msg);
            }
        });

        node.on(`close`, ()=>{
            SetStatus("Disconnected", "red");
        });
    }
    RED.nodes.registerType("whatsapp-in", WhatsappIn);
}
