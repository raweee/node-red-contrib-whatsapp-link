module.exports = function(RED) {
    function WhatsappIn(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        
        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});   
        };

        if(node.waClient.clientType === "waWebClient"){             
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

        else if (node.waClient.clientType === "waSocketClient"){
            var client = null
            async function clientFromWhatsappLite(){
                client = await node.waClient;
                
                client.ev.on('messages.upsert', msgs =>{
                    msgs.messages.forEach(async msg =>{
                        msg.payload = msg.message?.conversation;
                        msg.from = msg.key.participant || msg.key.remoteJid;
                        msg.from = msg.from.replace(/\D/g, '') || msg.from;
                        msg.chatID = msg.key.remoteJid.replace(/\D/g, '') || msg.key.remoteJid ;
                        node.send(msg)
                    })
                });
             
                
                //Setting conncetion status indication
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
            clientFromWhatsappLite();






        }

    }
    RED.nodes.registerType("chats-in", WhatsappIn);
}
