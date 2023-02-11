module.exports = function(RED) {
    const QRCode = require('qrcode');
    const FS = require('node:fs')
    const OS = require('os');
    const Path = require('path');
    let userDir = OS.homedir();
    let whatsappLinkDir = Path.join(userDir, '.node-red', 'Whatsapp-Link');
    let whatsappLinkDirSocket = Path.join(whatsappLinkDir, 'WA-Sockets');
    // let whatsappLinkDirSocketLogs = Path.join(whatsappLinkDir, 'WA-Sockets-logs');
        
    function RemoteClientNode(n) {
        RED.nodes.createNode(this,n);
        var WAnode = this;
        var clientType = n.clientType;
        var whatsappConnectionStatus;
        var client

        if (clientType ==="waWebClient"){
            const { Client, LocalAuth } = require('whatsapp-web.js');
            
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
                msg.body = `${msg.body}`;
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
            const makeWASocket = require('@adiwajshing/baileys');
            const { useMultiFileAuthState } = makeWASocket;
            const pino = require('pino');
            
            async function connectSocketClient() {
                const { state, saveCreds } = await useMultiFileAuthState(whatsappLinkDirSocket);
                // const loggerFile = pino.destination(whatsappLinkDirSocketLogs);
                const socketClient = makeWASocket.default({
                    printQRInTerminal: false,
                    logger:pino({level: "fatal"}),
                    auth : state,
                    browser: ["Node-RED", "Chrome", "4.0.0"],
                    markOnlineOnConnect: true,
                    patchMessageBeforeSending: (message) => {
                        const requiresPatch = !!(
                            message.buttonsMessage || message.templateMessage || message.listMessage
                        );
                        if (requiresPatch) {
                            message = {
                                viewOnceMessage: {
                                    message: {
                                        messageContextInfo: {
                                            deviceListMetadataVersion: 2,
                                            deviceListMetadata: {},
                                        },
                                        ...message,
                                    },
                                },
                            };
                        }
                        return message;
                        },
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
                                connectSocketClient()
                                FS.rmSync(whatsappLinkDirSocket, {recursive : true, force: true})
                            } else {
                                WAnode.log('Node Refressed')
                            }
                        }
                    }
                })
                return socketClient
            };
            client = connectSocketClient();
            client.clientType = clientType;
            client.clientStartFunction = connectSocketClient;
            WAnode.client = client
        };


        this.on('close', (removed, done)=>{
            if(removed){
                if(clientType === "waWebClient"){
                    clearInterval(WAnode.connectionSetupID);
                    WAnode.client.WAClose();
                } else {
                    WAnode.client.end()
                }

            }
            else {
                if(clientType === "waWebClient"){
                    clearInterval(WAnode.connectionSetupID);
                    WAnode.client.WAClose();
                } else { WAnode.client.end() }
            }
            done();

        });
       
    }
    RED.nodes.registerType("whatsappLink",RemoteClientNode);
}