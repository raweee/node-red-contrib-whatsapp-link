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
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        function whatsappMessage(numb , inputMessage){
            if (node.waClient){
                try {
                    numb = typeof numb ==='number' ? numb : numb.replace(/\D/g, '');
                    numb = `${numb}@c.us`;
                    node.waClient.sendMessage(numb, inputMessage);
                    SetStatus("Message Send.", "green");
                    setTimeout(()=>{
                        SetStatus('Connected','green');
                    }, 2000)
                }
                catch(e) {
                    node.log(`Error Sending Msg: ${e}`);
                }
            } else { node.log(`Error Sending Msg: ${e}`)}
        };

        node.on('input', (message)=> {
            if (node.number){
                whatsappMessage(node.number, message.payload);

            } else if (message.toNumber){
                var numbers = typeof message.toNumber === 'number' ? Array.of(message.toNumber) : message.toNumber;
                for (number of numbers) {
                    setTimeout(()=> {
                        whatsappMessage(number, message.payload)}
                        , 3000);
                }
            } else {
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
