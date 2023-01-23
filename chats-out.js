module.exports = function(RED) {
    function WhatsappOut(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.number = config.number;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        const { MessageMedia } = require('whatsapp-web.js')

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

        function whatsappMultiMediaMessage(numb, whatsappImage, whatsappCaption){
            try {
                numb = node.number;
                whatsappImage = whatsappImage.split(',')[1] || whatsappImage;
                var myMessage = new MessageMedia('image/png', whatsappImage, null, null);
                numb = typeof numb ==='number' ? numb : numb.replace(/\D/g, '');
                numb = `${numb}@c.us`;
                node.waClient.sendMessage(numb, myMessage, {caption : whatsappCaption || "Image from Node-Red"});
                SetStatus("Message Send.", "green");
                setTimeout(()=>{
                    SetStatus('Connected','green');
                }, 2000)
            } catch(e) {
                node.log(`Error sending MultiMedia Message : ${e}`)
            }
        };

        node.on('input', (message)=> {
            if (node.number){
                if (message.image){
                    whatsappMultiMediaMessage(node.number, message.image, message.payload);       
                } 
                else { 
                    whatsappMessage(node.number, message.payload);
                }

            } else if (message.toNumber){
                var numbers = typeof message.toNumber === 'number' ? Array.of(message.toNumber) : message.toNumber;
                for (number of numbers) {
                    if(message.image){
                        whatsappMultiMediaMessage(number, message.image, message.payload)
                        delay(2000);

                    } else {
                        whatsappMessage(number, message.payload)
                        delay(2000)
                    }
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
