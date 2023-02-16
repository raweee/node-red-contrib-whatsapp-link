module.exports = function(RED) {
    function WhatsappOut(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.number = config.number;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        const { MessageMedia, Buttons } = require('whatsapp-web.js')

        let SetStatus = function(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
        };
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        async function webNubmerSeteing(numb){
            numb = typeof numb ==='number' ? numb : numb.replace(/\D/g, '');
            // numb = `${numb}@c.us`;
            var numbID = await node.waClient.getNumberId(numb);
            if(numbID) {
                return `${numbID.user}@${numbID.server}`;
            } else {
                return `${numb}@g.us`
            }
            // return numb
        }

        async function socNubmerSeteing(numb){
            if (numb.remoteJid){
                return numb.remoteJid;
            }
            numb = typeof numb ==='number' ? numb : numb.replace(/\D/g, '');
            const [result] = await (await node.waClient).onWhatsApp(numb)
            if (result?.exists){
                console.log(result.exists)
                return result.jid
            }
            return numb = `${numb}@g.us`;
        }

        async function whatsappMessage(numb , inputMessage){
            if (node.waClient.clientType === "waWebClient"){
                try {
                    numb = await webNubmerSeteing(numb);
                    if(typeof inputMessage === "object"){
                        inputMessage = new Buttons(inputMessage.text, inputMessage.buttons, "text" ,inputMessage.footer);
                        node.waClient.sendMessage(numb, inputMessage);
                    }
                    node.waClient.sendMessage(numb, inputMessage);
                }
                catch(e){
                    node.error(`Error Sending Msg: ${e}`);
                }
            } 
            else if (node.waClient.clientType === "waSocketClient"){
                try {
                    let client = await node.waClient;
                    numb = await socNubmerSeteing(numb)
                    if (typeof inputMessage ==="string"){
                        inputMessage = {text : inputMessage};
                    }
                    const msgStatus = await client.sendMessage(numb, inputMessage);
                }
                catch(e) {
                    node.error(`Error Sending Msg:: ${e}`);
                }
            } 
            else { 
                node.error(`Error Sending Msg: ${e}`)
            }
            SetStatus("Message Send.", "green");
            setTimeout(()=>{
                SetStatus('Connected','green');
            }, 2000)
        };

        async function whatsappMultiMediaMessage(numb, whatsappImage, whatsappCaption){
            var whatsappImageBase64 = whatsappImage.split(',')[1] || whatsappImage;
            try {
                if (node.waClient.clientType === "waWebClient"){
                    numb = await webNubmerSeteing(node.number)
                    var myMessage = new MessageMedia('image/png', whatsappImageBase64, null, null);
                    node.waClient.sendMessage(numb, myMessage, {caption : whatsappCaption || "Image from Node-Red"});
                } 
                else {
                    numb = await socNubmerSeteing(node.number)
                    const imageMessage = {
                        text: whatsappCaption,
                        footer: null,
                        templateButtons: null,
                        image: {url : whatsappImage }
                    };
                    let client = await node.waClient;
                    const msgStatus = await client.sendMessage(numb, imageMessage);
                }              
                SetStatus("Message Send.", "green");
                setTimeout(()=>{
                    SetStatus('Connected','green');
                }, 2000)
            } catch(e) {
                node.error(`Error sending MultiMedia Message : ${e}`)
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
                var numbers = message.toNumber instanceof Array ? message.toNumber : Array.of(message.toNumber);
                for (number of numbers) {
                    if(message.image){
                        whatsappMultiMediaMessage(number, message.image, message.payload)
                        delay(2000);

                    } else {
                        whatsappMessage(number, message.payload)
                        delay(2000)
                    }
                }
            } else if(message.key.remoteJid){
                whatsappMessage(message.key, message.payload)
            } 
            else {
                SetStatus("No number","red");
                setTimeout(()=>{
                    SetStatus('Connected','green');
                }, 5000)
            }
        });

        //whatsapp Status Parameters----
        if (node.waClient.clientType === "waWebClient"){
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

        } else if (node.waClient.clientType === "waSocketClient"){
            async function checkStatusOfSockets(){
                let client = await node.waClient;
                client.ev.on('connection.update', (updates)=>{
                    var {connection} = updates
                    if(connection === 'open'){
                        SetStatus("Connected", "green");
                    }
                    else if(updates.isOnline){
                        SetStatus("Connected", "green");
                    }
                    else if(connection === 'close'){
                        SetStatus("Disconnected", "red");
                    }
                    else if(connection === 'connecting'){
                        SetStatus("Connecting...", "yellow");
                    }
                    else if(updates.qr){
                        SetStatus("Scan QR Code to Connect.", "yellow");
                    }
                })
            }
            checkStatusOfSockets();

        }

    }
    RED.nodes.registerType("chats-out", WhatsappOut);
}
