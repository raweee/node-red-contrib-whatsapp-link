module.exports = function(RED) {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const makeWASocket = require('@adiwajshing/baileys');
    const { useMultiFileAuthState } = makeWASocket
    const QRCode = require('qrcode');
    const FS = require('node:fs')
    const OS = require('os');
    const Path = require('path');

        let userDir = OS.homedir();
        let whatsappLinkDir = Path.join(userDir, '.node-red', 'Whatsapp-Link');
        let whatsappLinkDirSocket = Path.join(whatsappLinkDir, 'WA-Sockets')
        function RemoteClientNode(n) {
            RED.nodes.createNode(this,n);
            var WAnode = this;
            var clientType = n.clientType;
            var whatsappConnectionStatus;
            var client
        
            var WAConnect = function(){
                const webClient = new Client({
                    authStrategy : new LocalAuth({
                        dataPath : whatsappLinkDir
                    }),
                    puppeteer : {
                        headless : true,
                        args : ['--no-sandbox', '--disable-setuid-sandbox']
                    }
                });

                try {
                    webClient.initialize();
                    WAnode.log("Status : Initializing Whatsapp..");
                }
                catch(e) {
                    WAnode.log(`Error : Unable to start Whatsapp. Try Again..`);
                };
                return webClient ;
            };

            if (clientType ==="waWebClient"){
                client = WAConnect();
                WAnode.connectionSetupID = setInterval(connectionSetup, 10000); 

                function WAClose(){
                    try { 
                        client.destroy();
                    }
                    catch(e){
                        WAnode.err(`Error : Too many instructions! Try again.`)
                    }
                };
                    
                var WARestart = function(){
                    WAClose();
                    WAConnect();
                }

                async function connectionSetup(){
                    try {
                        whatsappConnectionStatus = await client.getState();
                        if(whatsappConnectionStatus === "CONNECTED"){
                            clearInterval(WAnode.connectionSetupID);
                        }
                        else {
                            WAnode.log(`Status : Connecting to Whatsapp...`);
                        }
                    }
                    catch(e){
                        WAnode.log(`Error : Waiting for Initializion...`);
                    }
                };

                //QR-Code on Terminal and Ready Status. 
                client.on("qr", (qr)=>{
                    clearInterval(WAnode.connectionSetupID);
                    QRCode.toString(qr, {type : 'terminal', small:true }, function(err, QRTerminal){
                        WAnode.log(`To Connect, Scan the QR Code through your Whatsapp Mobile App.`)
                        console.log("");
                        console.log(QRTerminal);
                    });
                });
                client.on("ready", ()=>{
                    WAnode.log(`Status : Whatsapp Connected`);
                });

                //Whatsapp-Link Test Features (For Status and Testing Only.)
                client.on('message_create', async (msg)=> {
                    if (msg.body.startsWith('!nodered')){
                        let chat = await msg.getChat();
                        let contact = await msg.getContact();
                        if (chat.isGroup){
                            let msgReply = 
    `Hi From Node-Red.
    ------------------
    Group Name   : ${chat.name},
    Group Id     : ${chat.id.user},
    Group Admin  : ${chat.groupMetadata.owner.user},
    Participants : ${chat.groupMetadata.size}`
                            msg.reply(msgReply);
                        }
                        else {
                            let msgReply = `Hi @${contact.number} From Node-Red.`
                            chat.sendMessage(msgReply, {
                                mentions : [contact]
                            });  
                        }
                        
                    }

                });

                client.WAConnect = WAConnect;
                client.WARestart = WARestart;
                client.WAClose = WAClose;
                client.clientType = clientType;
                WAnode.client = client;
            };

            if (clientType === "waSocketClient"){
                
                async function connectSocketClient() {
                    const { state, saveCreds } = await useMultiFileAuthState(whatsappLinkDirSocket);
                    const socketClient = makeWASocket.default({
                        printQRInTerminal: false,
                        auth : state
                    })

                    socketClient.ev.on('creds.update', saveCreds)
            
                    socketClient.ev.on('connection.update', (update) => {
                        const { connection, lastDisconnect } = update
                        if (connection === 'close') {
                            // reconnect if not logged out
            
                            if (
                                lastDisconnect &&
                                lastDisconnect.error &&
                                lastDisconnect.error.output &&
                                (lastDisconnect.error.output.statusCode === 410 ||
                                    lastDisconnect.error.output.statusCode === 428 ||
                                    lastDisconnect.error.output.statusCode === 515)
                            ) {
                                connectSocketClient()
                            } else {
                                if (
                                    lastDisconnect &&
                                    lastDisconnect.error &&
                                    lastDisconnect.error.output &&
                                    lastDisconnect.error.output.statusCode === 401
                                ) {
                                    FS.rmSync(whatsappLinkDirSocket, {recursive : true, force: true})
                                    connectSocketClient()
                                    
                                } else {
                                    console.log('Error unexpected', update)
                                }
                            }
                        }
                        if(update.qr){
                            QRCode.toDataURL(update.qr, function(err, url){
                                var qrImageWithID = {};
                                qrImageWithID.id = WAnode.id;
                                qrImageWithID.image = url;
                                RED.comms.publish("whatsappLinkQrCode", qrImageWithID);
                            });

                            QRCode.toString(update.qr, {type : 'terminal', small:true }, function(err, QRTerminal){
                                WAnode.log(`To Connect, Scan the QR Code through your Whatsapp Mobile App.`)
                                console.log("");
                                console.log(QRTerminal);
                            });
                        }
                        if (connection === 'open') {
                            var qrImageWithID = {};
                            qrImageWithID.id = WAnode.id;
                            qrImageWithID.image = null;
                            RED.comms.publish("whatsappLinkQrCode", qrImageWithID);
                        }
                    })
                    return socketClient
                };
                client = connectSocketClient();
                client.clientType = clientType;
                WAnode.client = client
            };


            this.on('close', (removed, done)=>{
                if(removed){
                    if(clientType === "waWebClient"){
                        clearInterval(WAnode.connectionSetupID);
                        WAnode.client.WAClose();
                    }
                }
                else {
                    if(clientType === "waWebClient"){
                        clearInterval(WAnode.connectionSetupID);
                        WAnode.client.WAClose();
                    }
                }
                done();

            });
       
    }
    RED.nodes.registerType("whatsappLink",RemoteClientNode);
}